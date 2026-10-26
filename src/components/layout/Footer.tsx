import React from "react";
import Link from "next/link";

const COLUMNS = [
  {
    title: "Drivers",
    links: [
      { href: "/find", label: "Find parking" },
      { href: "/dashboard/driver", label: "My trips" },
    ],
  },
  {
    title: "Hosts",
    links: [
      { href: "/host/new", label: "List your space" },
      { href: "/dashboard/host", label: "Host dashboard" },
    ],
  },
  {
    title: "Trust",
    links: [
      { href: "/#trust", label: "How we keep you safe" },
      { href: "/#how", label: "How it works" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="bg-ink text-white mt-32 pt-20 pb-36 px-6 md:px-16">
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-16 lg:grid-cols-2 pb-16">
          <h2 className="text-[32px] md:text-[44px] font-medium leading-[1.1] tracking-[-0.02em] max-w-md">
            Every empty spot, in orbit.
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-10">
            {COLUMNS.map((col) => (
              <div key={col.title} className="flex flex-col gap-3">
                <h3 className="text-[12px] font-bold uppercase tracking-[0.04em] text-taupe/70">
                  {col.title}
                </h3>
                {col.links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-[14px] font-[450] text-white/80 hover:text-white transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-white/15 pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-[13px] text-white/50">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="ParkOrbit Logo"
              width={20}
              height={24}
              className="h-6 w-auto object-contain"
            />
            <span>© {new Date().getFullYear()} ParkOrbit · Pune, Maharashtra</span>
          </div>
          <span>Demo build · payments are simulated</span>
        </div>
      </div>
    </footer>
  );
}
