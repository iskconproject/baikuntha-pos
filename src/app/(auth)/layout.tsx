import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign In - VaikunthaPOS',
  description: 'Sign in to VaikunthaPOS - ISKCON Temple POS System',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-saffron-50 to-saffron-100">
      {children}
    </div>
  );
}