
import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import qrcode from "qrcode";
import sharp from "sharp";

async function fetchImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const cleanHex = (hex || "#000000").replace("#", "");
  const result = /^([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(cleanHex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 }; // Default to black
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as {
      churchName?: string;
      logoUrl?: string;
      roles?: string[];
      signupUrl: string;
      primaryColor?: string;
      heroImageDataUrl?: string;
      heroImageUrl?: string;
    };
    const { churchName, logoUrl, roles = [], signupUrl, primaryColor = "#000000", heroImageDataUrl, heroImageUrl } = body;

    // --- PDF Creation ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]); // 8.5 x 11 inches at 72 dpi

    const { width, height } = page.getSize();

    // --- Fonts ---
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

    // --- Colors ---
    const primaryRgb = hexToRgb(primaryColor);
    const textColor = rgb(0.2, 0.2, 0.2);
    const secondaryTextColor = rgb(0.33, 0.33, 0.33);

    // --- Header Image ---
    let headerImageHeight = 0;
    const resolvedHeroBytes: Buffer | undefined = heroImageDataUrl
      ? Buffer.from(heroImageDataUrl.replace(/^data:image\/\w+;base64,/, ""), "base64")
      : heroImageUrl
        ? await fetchImage(heroImageUrl).catch(() => undefined)
        : undefined;
    if (resolvedHeroBytes) {
      try {
        // 300 DPI: 8.5" wide × 2.5" tall header = 2550×750 px (ratio 3.4:1 matching the PDF band)
        const pngBytes = await sharp(resolvedHeroBytes)
          .resize(2550, 750, { fit: "cover", position: "centre" })
          .png()
          .toBuffer();
        const headerImage = await pdfDoc.embedPng(pngBytes);
        headerImageHeight = 180;
        page.drawImage(headerImage, {
          x: 0,
          y: height - headerImageHeight,
          width: width,
          height: headerImageHeight,
        });
      } catch {
        // unsupported format — skip header image gracefully
      }
    }

    const contentPaddingX = 54; // 0.75 inch
    let currentY = height - headerImageHeight - 48;

    // --- Header Section ---
    let logoWidth = 0;
    let logoImage;
    let logoDims;

    if (logoUrl) {
      try {
        const logoImageBytes = await fetchImage(logoUrl);
        logoImage = await pdfDoc.embedPng(logoImageBytes);
        logoDims = logoImage.scale(0.5);
        logoWidth = Math.min(logoDims.width, 64);
      } catch (e) {
        console.warn("Could not embed logo:", e);
        logoWidth = 0;
      }
    }

    const titleText = "Serve With Us";
    const titleFontSize = 40;
    const subtitleFontSize = 14;
    const subtitleText = churchName || "Our Church Community";
    const titleWidth = helveticaBold.widthOfTextAtSize(titleText, titleFontSize);
    const subtitleWidth = helvetica.widthOfTextAtSize(subtitleText, subtitleFontSize);
    const textBlockWidth = Math.max(titleWidth, subtitleWidth);
    const headerGap = 15;
    const totalHeaderWidth = logoWidth + (logoWidth > 0 ? headerGap : 0) + textBlockWidth;
    const headerStartX = (width - totalHeaderWidth) / 2;

    if (logoImage && logoDims && logoWidth > 0) {
      const logoHeight = (logoWidth / logoDims.width) * logoDims.height;
      page.drawImage(logoImage, {
        x: headerStartX,
        y: currentY - logoHeight / 2, // Vertically center the logo
        width: logoWidth,
        height: logoHeight,
      });
    }

    const textStartX = headerStartX + logoWidth + (logoWidth > 0 ? headerGap : 0);

    page.drawText(titleText, {
      x: textStartX,
      y: currentY,
      font: helveticaBold,
      size: titleFontSize,
      color: rgb(primaryRgb.r, primaryRgb.g, primaryRgb.b),
    });

    page.drawText(subtitleText, {
      x: textStartX,
      y: currentY - 22,
      font: helvetica,
      size: subtitleFontSize,
      color: secondaryTextColor,
    });

    currentY -= 80;

    // --- Main Content ---
    const introText =
      "Join a dedicated team and use your time and talents to serve our community. We have a place for everyone!";
    const introTextSize = 12;
    page.drawText(introText, {
      x: contentPaddingX,
      y: currentY,
      font: helvetica,
      size: introTextSize,
      color: textColor,
      maxWidth: width - contentPaddingX * 2,
      lineHeight: 18,
    });

    currentY -= 60;

    if (roles.length > 0) {
      const rolesTitle = "Open Volunteer Roles";
      const rolesTitleSize = 20;

      currentY -= 35;

      // --- Roles List ---
      const actualColCount = roles.length > 1 ? 2 : 1;
      const colGap = 40;
      const maxRoleWidth = 150; 
      
      const totalListWidth = actualColCount * maxRoleWidth + (actualColCount - 1) * colGap;
      const listX = (width - totalListWidth) / 2;
      const colWidth = maxRoleWidth + colGap;

      const rolesTitleWidth = helveticaBold.widthOfTextAtSize(rolesTitle, rolesTitleSize);
      page.drawText(rolesTitle, {
        x: listX + (totalListWidth - rolesTitleWidth) / 2,
        y: currentY + 35,
        font: helveticaBold,
        size: rolesTitleSize,
        color: textColor,
      });

      let col1Y = currentY;
      let col2Y = currentY;

      roles.slice(0, 10).forEach((role: string, index: number) => {
        const columnIndex = actualColCount === 1 ? 0 : index % 2;
        const xPos = columnIndex === 0 ? listX : listX + colWidth;
        const yPos = columnIndex === 0 ? col1Y : col2Y;

        page.drawText(`• ${role}`, {
          x: xPos,
          y: yPos,
          font: helvetica,
          size: 14,
          color: textColor,
          maxWidth: maxRoleWidth,
        });

        if (columnIndex === 0) col1Y -= 24;
        else col2Y -= 24;
      });

      const lowestColY = Math.min(col1Y, col2Y);
      currentY = lowestColY - 20;
    }

    // --- Footer ---
    const footerY = 72;

    page.drawLine({
      start: { x: contentPaddingX, y: footerY + 110 },
      end: { x: width - contentPaddingX, y: footerY + 110 },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });

    // QR Code
    const qrCodeDataUrl = await qrcode.toDataURL(signupUrl, {
      errorCorrectionLevel: "H",
      margin: 2,
    });
    const qrCodeImageBytes = Buffer.from(qrCodeDataUrl.split(",")[1], "base64");
    const qrCodeImage = await pdfDoc.embedPng(qrCodeImageBytes);
    const qrSize = 90;
    const qrCodeX = width / 2 - qrSize - 30;

    page.drawImage(qrCodeImage, {
      x: qrCodeX,
      y: footerY,
      width: qrSize,
      height: qrSize,
    });

    // QR Code Info
    const infoX = qrCodeX + qrSize + 25;
    page.drawText("Ready to Join?", {
      x: infoX,
      y: footerY + 55,
      font: helveticaBold,
      size: 20,
      color: textColor,
    });
    page.drawText(
      "Scan the code with your phone's camera or visit the web address below to sign up!",
      {
        x: infoX,
        y: footerY + 40,
        font: helvetica,
        size: 10,
        lineHeight: 14,
        maxWidth: 160,
        color: secondaryTextColor,
      },
    );

    // Web address at bottom
    const webAddress = signupUrl.replace(/^https?:\/\//, "");
    const webAddressWidth = helveticaBold.widthOfTextAtSize(webAddress, 10);
    page.drawText(webAddress, {
      x: width / 2 - webAddressWidth / 2,
      y: footerY - 20,
      font: helveticaBold,
      size: 10,
      color: textColor,
    });

    // --- Finalize PDF ---
    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="volunteer-flyer.pdf"',
      },
    });
  } catch (error: unknown) {
    console.error("PDF Generation Error:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return new NextResponse(`Failed to generate PDF: ${errorMessage}`, { status: 500 });
  }
}
