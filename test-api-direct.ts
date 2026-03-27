
const API_KEY = "AIzaSyCPu0-4p5EIZoPeHlgzsnasUwcr0Fq5SrM";

async function test() {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`;
  
  console.log("Testing connection to:", url.replace(API_KEY, "HIDDEN_KEY"));

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello, are you there?" }] }]
      })
    });

    console.log("Status:", response.status);
    const text = await response.text();
    console.log("Response:", text);
    
    if (!response.ok) {
        console.error("Failed.");
    }
  } catch (e) {
    console.error("Fetch error:", e);
  }
}

test();
