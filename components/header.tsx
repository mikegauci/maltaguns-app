"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { SearchBar } from "@/components/search";
import { Store, BookOpen, Menu, X } from "lucide-react";

export function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <>
      <header className="border-b">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <img src="/maltaguns.png" alt="MaltaGuns Logo" className="h-8 w-auto" />
          </Link>

          {/* Mobile search bar - visible only on mobile */}
          <div className="flex-1 mx-4 md:hidden">
            <SearchBar disableShortcut={true} />
          </div>

          <button
            className="md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>

          <nav className="hidden md:flex items-center gap-4">
            {/* Desktop search bar - now before Marketplace */}
            <div className="hidden md:block">
              <SearchBar disableShortcut={false} />
            </div>
            <Link href="/marketplace">
              <Button variant="ghost">Marketplace</Button>
            </Link>
            <Link href="/retailers">
              <Button variant="ghost">
                <Store className="h-4 w-4 mr-2" />
                Retailers
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="ghost">Events</Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost">
                <BookOpen className="h-4 w-4 mr-2" />
                Blog
              </Button>
            </Link>
            
            {user ? (
              <>
                <Link href="/profile">
                  <Button variant="ghost">Profile</Button>
                </Link>
                <Button variant="outline" onClick={handleLogout}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost">Login</Button>
                </Link>
                <Link href="/register">
                  <Button>Register</Button>
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {menuOpen && (
        <nav className="md:hidden bg-background border-b">
          <div className="container mx-auto px-4 py-3 flex flex-col gap-4">
            <Link href="/marketplace">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>Marketplace</Button>
            </Link>
            <Link href="/retailers">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                <Store className="h-4 w-4 mr-2" />
                Retailers
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>Events</Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                <BookOpen className="h-4 w-4 mr-2" />
                Blog
              </Button>
            </Link>
            
            {user ? (
              <>
                <Link href="/profile">
                  <Button variant="ghost" onClick={() => setMenuOpen(false)}>Profile</Button>
                </Link>
                <Button variant="outline" onClick={() => { handleLogout(); setMenuOpen(false); }}>
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" onClick={() => setMenuOpen(false)}>Login</Button>
                </Link>
                <Link href="/register">
                  <Button onClick={() => setMenuOpen(false)}>Register</Button>
                </Link>
              </>
            )}
          </div>
        </nav>
      )}
    </>
  );
}