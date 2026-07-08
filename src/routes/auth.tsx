import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { z } from "zod";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — PUNIQUE KITCHEN" }, { name: "robots", content: "noindex" }] }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email();
const passwordSchema = z.string().min(6).max(72);

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", name: "", phone: "" });

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      emailSchema.parse(form.email);
      passwordSchema.parse(form.password);
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      if (error) throw error;
      toast.success("Welcome back!");
      navigate({ to: "/account" });
    } catch (err: any) {
      toast.error(err?.message ?? "Sign-in failed");
    } finally { setLoading(false); }
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      emailSchema.parse(form.email);
      passwordSchema.parse(form.password);
      const { error } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: { name: form.name, phone: form.phone },
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success("Check your email to confirm your account.");
    } catch (err: any) {
      toast.error(err?.message ?? "Sign-up failed");
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="font-display text-3xl font-bold">Welcome</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in for faster checkout and order history.</p>
        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign in</TabsTrigger>
            <TabsTrigger value="signup">Create account</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form onSubmit={signIn} className="space-y-4 pt-4">
              <Field label="Email" id="e1"><Input id="e1" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Password" id="p1"><Input id="p1" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
              <Button type="submit" disabled={loading} className="w-full">Sign in</Button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form onSubmit={signUp} className="space-y-4 pt-4">
              <Field label="Your name" id="n2"><Input id="n2" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
              <Field label="Phone" id="ph2"><Input id="ph2" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
              <Field label="Email" id="e2"><Input id="e2" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
              <Field label="Password (min 6 chars)" id="p2"><Input id="p2" type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></Field>
              <Button type="submit" disabled={loading} className="w-full">Create account</Button>
              <p className="text-xs text-muted-foreground">Signing up with a @puniqueofficial.com email grants admin access after email confirmation.</p>
            </form>
          </TabsContent>
        </Tabs>
        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">← Back to home</Link>
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <Label htmlFor={id}>{label}</Label>
      {children}
    </div>
  );
}