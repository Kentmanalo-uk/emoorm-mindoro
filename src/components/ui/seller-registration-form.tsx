import React, { useState } from "react";
import { Button } from "@/components/ui/button";

export function SellerRegistrationForm({
  onSuccess,
}: {
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    storeName: "",
    contact: "",
    address: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      onSuccess();
    }, 1200);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-xl font-semibold mb-2">Seller Registration</h2>
      <input
        name="storeName"
        value={form.storeName}
        onChange={handleChange}
        className="w-full border rounded px-3 py-2"
        placeholder="Store Name"
        required
      />
      <input
        name="contact"
        value={form.contact}
        onChange={handleChange}
        className="w-full border rounded px-3 py-2"
        placeholder="Contact Number"
        required
      />
      <input
        name="address"
        value={form.address}
        onChange={handleChange}
        className="w-full border rounded px-3 py-2"
        placeholder="Business Address"
        required
      />
      <textarea
        name="description"
        value={form.description}
        onChange={handleChange}
        className="w-full border rounded px-3 py-2"
        placeholder="Short Description"
        rows={3}
        required
      />
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Registering..." : "Register as Seller"}
      </Button>
    </form>
  );
}
