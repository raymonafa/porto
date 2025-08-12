// app/about/page.js
import Navbar from "@/components/Navbar";

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-[#f8f8f8] text-black">
      <Navbar />
      <section className="pt-24 px-6">
        About Page
      </section>
    </main>
  );
}
