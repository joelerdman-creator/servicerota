"use client";

import React, { useState, useEffect } from "react";
import { getLocalComplianceStatus, submitTollFreeVerification, TollFreeFormData, TwilioOptInType } from "@/lib/twilio-compliance";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, RefreshCcw, ShieldCheck, AlertTriangle } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";

export default function SmsCompliancePage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState<any>(null);

  // Form State
  const [form, setForm] = useState<TollFreeFormData>({
    businessName: "",
    businessWebsite: "",
    notificationEmail: "",
    useCaseCategories: ["CUSTOMER_CARE"],
    useCaseSummary: "We send assignment notifications, substitution requests, and reminders to scheduled volunteers.",
    productionMessageSample: "Hi John, you have a new serving request for Sunday at 9 AM. Reply YES to accept or NO to decline. Reply STOP to cancel.",
    optInImageUrls: [""],
    optInType: "WEB_FORM",
    messageVolume: "10,000",
    businessContactFirstName: "",
    businessContactLastName: "",
    businessContactEmail: "",
    businessContactPhone: "",
    businessStreetAddress: "",
    businessCity: "",
    businessStateProvinceRegion: "",
    businessPostalCode: "",
    businessCountry: "US",
  });

  const loadStatus = async () => {
    setIsLoading(true);
    try {
      const data = await getLocalComplianceStatus();
      setStatus(data);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Failed to load Twilio Compliance Status");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // OptInImageUrls requires an array, we slice out blanks
      const cleanedForm = {
        ...form,
        optInImageUrls: form.optInImageUrls.filter(u => !!u.trim()),
      };
      
      if (cleanedForm.optInImageUrls.length === 0) {
        throw new Error("You must provide at least one Image URL showing your opt-in workflow.");
      }

      await submitTollFreeVerification(cleanedForm);
      toast.success("Verification request submitted successfully!");
      loadStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to submit verification");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isVerified = status?.status === "TWILIO_APPROVED" || status?.status === "VERIFIED";
  const isPending = status?.status === "PENDING_REVIEW" || status?.status === "IN_REVIEW";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <header>
        <h1 className="text-3xl font-bold">SMS Compliance</h1>
        <p className="text-muted-foreground mt-1">
          Manage sending compliance to ensure your Application texts are not filtered by carriers.
        </p>
      </header>

      {/* Status Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Toll-Free Verification Status</CardTitle>
            <CardDescription className="font-mono mt-1">
              {status?.phoneNumber || "No Number Configured"}
            </CardDescription>
          </div>
          <Button variant="outline" size="icon" onClick={loadStatus} title="Poll Status">
            <RefreshCcw className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {isVerified ? (
              <Badge className="bg-emerald-500 hover:bg-emerald-600 px-3 py-1">
                <ShieldCheck className="w-4 h-4 mr-2" /> VERIFIED
              </Badge>
            ) : isPending ? (
              <Badge className="bg-amber-500 hover:bg-amber-600 px-3 py-1">
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> {status?.status || "PENDING"}
              </Badge>
            ) : (
              <Badge variant="destructive" className="px-3 py-1">
                <AlertTriangle className="w-4 h-4 mr-2" /> {status?.status || "UNREGISTERED"}
              </Badge>
            )}
            
            {status?.errorMessage && (
              <p className="text-sm text-destructive">{status.errorMessage}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verification Form */}
      {(!isVerified && !isPending) && (
        <Card>
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Submit Registration</CardTitle>
              <CardDescription>
                Provide detailed business information to verify this Toll-Free number. This process manually reviewed by carriers and typically takes 3-5 business days.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              
              {/* Business Info */}
              <div className="space-y-4">
                <h3 className="font-medium">Business Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Business Name</Label>
                    <Input name="businessName" value={form.businessName} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Website URL</Label>
                    <Input name="businessWebsite" type="url" placeholder="https://" value={form.businessWebsite} onChange={handleChange} required />
                  </div>
                </div>
              </div>

              {/* Address */}
              <div className="space-y-4">
                <h3 className="font-medium">Business Address</h3>
                <div className="space-y-2">
                  <Label>Street Address</Label>
                  <Input name="businessStreetAddress" value={form.businessStreetAddress} onChange={handleChange} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>City</Label>
                    <Input name="businessCity" value={form.businessCity} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label>State / Province</Label>
                    <Input name="businessStateProvinceRegion" value={form.businessStateProvinceRegion} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Postal Code</Label>
                    <Input name="businessPostalCode" value={form.businessPostalCode} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Country (ISO 2-letter)</Label>
                    <Input name="businessCountry" placeholder="US" maxLength={2} value={form.businessCountry} onChange={handleChange} required />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-4">
                <h3 className="font-medium">Authorized Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input name="businessContactFirstName" value={form.businessContactFirstName} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input name="businessContactLastName" value={form.businessContactLastName} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Email</Label>
                    <Input name="businessContactEmail" type="email" value={form.businessContactEmail} onChange={handleChange} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Contact Phone</Label>
                    <Input name="businessContactPhone" type="tel" value={form.businessContactPhone} onChange={handleChange} required />
                  </div>
                </div>
              </div>

              {/* Messaging Use Case */}
              <div className="space-y-4">
                <h3 className="font-medium">Messaging & Opt-In Workflow</h3>
                <div className="space-y-2">
                  <Label>Use Case Summary</Label>
                  <Textarea name="useCaseSummary" value={form.useCaseSummary} onChange={handleChange} required className="h-20" />
                  <p className="text-xs text-muted-foreground">Explain exactly how you use SMS and how a user opts in to receive them.</p>
                </div>
                
                <div className="space-y-2">
                  <Label>Production Message Sample</Label>
                  <Textarea name="productionMessageSample" value={form.productionMessageSample} onChange={handleChange} required className="h-20" />
                  <p className="text-xs text-muted-foreground">Provide an actual sample of a message you send, including Opt-Out instructions (e.g., "Reply STOP to cancel").</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Opt-In Type</Label>
                    <Select value={form.optInType} onValueChange={(v) => setForm(f => ({ ...f, optInType: v as TwilioOptInType }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="WEB_FORM">Web Form</SelectItem>
                        <SelectItem value="PAPER_FORM">Paper Form</SelectItem>
                        <SelectItem value="VIA_TEXT">Via Text</SelectItem>
                        <SelectItem value="MOBILE_QR_CODE">Mobile QR Code</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly Message Volume</Label>
                    <Select value={form.messageVolume} onValueChange={(v) => setForm(f => ({ ...f, messageVolume: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10,000">10,000</SelectItem>
                        <SelectItem value="100,000">100,000</SelectItem>
                        <SelectItem value="250,000">250,000</SelectItem>
                        <SelectItem value="500,000">500,000</SelectItem>
                        <SelectItem value="1,000,000">1,000,000</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Opt-In Workflow Screenshot URL</Label>
                  <Input 
                    placeholder="https://.../screenshot.jpg" 
                    type="url"
                    value={form.optInImageUrls[0]} 
                    onChange={(e) => setForm(f => ({ ...f, optInImageUrls: [e.target.value] }))} 
                    required 
                  />
                  <p className="text-xs text-muted-foreground">Provide a direct link to an image/screenshot showing where a user enters their phone number and consents to receive messages.</p>
                </div>
              </div>

            </CardContent>
            <CardFooter className="justify-end bg-muted/40 py-4 mt-6">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Verification To Twilio
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}
    </div>
  );
}
