import React from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";

export function SellerInfoStepper({ onContinue }: { onContinue: () => void }) {
  return (
    <Tabs defaultValue="page1" className="w-full">
      <TabsList className="flex justify-between mb-4">
        <TabsTrigger value="page1">Why Sell?</TabsTrigger>
        <TabsTrigger value="page2">How it Works</TabsTrigger>
        <TabsTrigger value="page3">Get Started</TabsTrigger>
      </TabsList>
      <TabsContent value="page1">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Why Sell on E-Moorm?</h2>
          <p>
            Reach thousands of buyers, manage your store easily, and grow your
            business with our tools and support.
          </p>
        </div>
      </TabsContent>
      <TabsContent value="page2">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">How Selling Works</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Register as a seller and set up your store.</li>
            <li>List your products or facilities.</li>
            <li>Manage orders and communicate with customers.</li>
            <li>Receive payouts directly to your account.</li>
          </ul>
        </div>
      </TabsContent>
      <TabsContent value="page3">
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Ready to Start?</h2>
          <p>
            Click continue to fill out your seller registration and unlock your
            seller dashboard.
          </p>
          <Button className="mt-4 w-full" onClick={onContinue}>
            Continue
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
}
