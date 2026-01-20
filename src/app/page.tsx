import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-4xl text-center">
        <h1 className="text-5xl font-bold text-primary mb-6">
          Trade Control
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Comprehensive SaaS platform for Australian trade businesses
        </p>
        <div className="flex gap-4 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-600 transition-colors"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-6 py-3 border border-primary text-primary rounded-lg hover:bg-blue-50 transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    </main>
  );
}
