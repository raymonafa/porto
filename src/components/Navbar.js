// components/Navbar.js
export default function Navbar() {
  return (
    <nav className="absolute top-0 left-0 w-full p-6 flex justify-between text-sm uppercase tracking-widest z-20">
      <div>Mana Mona</div>
      <div className="space-x-4">
        <a href="#work" className="hover:underline">Work</a>
        <a href="#about" className="hover:underline">About</a>
      </div>
    </nav>
  )
}