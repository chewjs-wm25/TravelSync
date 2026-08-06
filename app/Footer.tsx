// components/layout/Footer.tsx
export default function Footer() {
  return (
    <footer className="w-full border-t-2 border-gray-200 bg-gray-100 py-6 text-center text-sm text-gray-500">
      <p>© {new Date().getFullYear()} TravelSync. All rights reserved.</p>
    </footer>
  );
}
