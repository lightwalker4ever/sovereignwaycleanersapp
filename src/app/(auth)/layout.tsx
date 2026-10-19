export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-dash-bg px-6 font-sans">
      {children}
    </div>
  );
}
