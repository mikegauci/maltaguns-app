"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SearchBar } from "@/components/search";
import { Store, BookOpen, Menu, X, User } from "lucide-react";
import { useSupabase } from "./providers/supabase-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const router = useRouter();
  const { supabase, session } = useSupabase();
  const [menuOpen, setMenuOpen] = useState(false);

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
                Retailers
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="ghost">Events</Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost">
                Blog
              </Button>
            </Link>
            <Link href="/help">
              <Button variant="ghost">Help</Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost">Contact</Button>
            </Link>
            
            {/* Profile Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`rounded-full h-10 w-10 flex items-center justify-center bg-background ${session?.user ? 'border-green-500 border-2' : 'border'}`}>
                  <User className="h-6 w-6" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-40 p-2 mt-2">
                {session?.user ? (
                  <>
                    <DropdownMenuItem className="cursor-pointer">
                      <Link href="/profile" className="w-full">
                        Account
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer text-destructive" 
                      onClick={handleLogout}
                    >
                      Log Out
                    </DropdownMenuItem>
                  </>
                ) : (
                  <>
                    <DropdownMenuItem className="cursor-pointer">
                      <Link href="/login" className="w-full">
                        Login
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-default">
                      <span className="text-sm text-muted-foreground">Or</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="cursor-pointer">
                      <Link href="/register" className="w-full">
                        Register
                      </Link>
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
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
                Retailers
              </Button>
            </Link>
            <Link href="/events">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>Events</Button>
            </Link>
            <Link href="/blog">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>
                Blog
              </Button>
            </Link>
            <Link href="/help">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>Help</Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost" onClick={() => setMenuOpen(false)}>Contact</Button>
            </Link>
            
            {/* Mobile Profile Dropdown */}
            {session?.user ? (
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