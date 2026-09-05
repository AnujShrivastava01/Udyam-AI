"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  MessageSquare,
  PlusCircle,
  Send,
  Share2,
  ThumbsUp,
  Trash2,
} from "lucide-react";

import { useAppStore } from "@/lib/store";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  MAX_POST_LENGTH,
  POST_KINDS,
  newPost,
  relativeTime,
  type PostKind,
} from "@/lib/community/posts";

/**
 * WHAT THIS SCREEN CLAIMS, AND WHAT IT DOES NOT.
 *
 * It claims: you can write something, it is kept, and it is yours. All three are true — posts go
 * into the persisted store and survive a reload.
 *
 * It does not claim an audience. There is no server, no accounts and no other users, so there are
 * no replies, no like counts on your own writing, and no member total. The three illustrative
 * posts below are marked "Example" and are visually distinct from anything you wrote, because a
 * reader must never have to parse the words to work out which is which.
 *
 * The composer used to be a dead input with a disabled button — the interaction was mimed. It now
 * works, within the scope stated above.
 */

const EXAMPLE_POSTS = [
  {
    id: 1,
    author: { name: "Rajesh Kumar", role: "entrepreneur", verified: false, initials: "RK" },
    content:
      "Just secured my loan under the Mudra scheme! Thanks to everyone here who helped me with the documentation process. The new dairy farm setup starts next week.",
    time: "2 hours ago",
    likes: 24,
    comments: 5,
    category: "Dairy & Livestock",
  },
  {
    id: 2,
    author: { name: "A district NGO", role: "ngo", verified: false, initials: "NG" },
    content:
      "We are organizing a free veterinary camp this Sunday at the block headquarters. All dairy farmers are welcome to bring their cattle for checkups.",
    time: "5 hours ago",
    likes: 89,
    comments: 12,
    category: "Dairy & Livestock",
  },
  {
    id: 3,
    author: { name: "A lending institution", role: "financial-institution", verified: false, initials: "FI" },
    // Deliberately makes no claim about rates, revisions or eligibility. A named real bank saying
    // "rates have been revised" is a false statement about that bank whether or not it is badged,
    // and "check your eligibility" is the exact class of claim verifyNoUnsupportedClaims strips
    // from generated text — it must not be shipped as static JSX that no verifier ever sees.
    content:
      "Example post. In a real deployment this feed carries notices from the State Channelizing Agency; nothing here is an actual notice.",
    time: "1 day ago",
    likes: 156,
    comments: 45,
    category: "Finance",
  },
];

export default function CommunityPage() {
  const onboardingInput = useAppStore((s) => s.onboardingInput);
  const posts = useAppStore((s) => s.communityPosts);
  const addCommunityPost = useAppStore((s) => s.addCommunityPost);
  const deleteCommunityPost = useAppStore((s) => s.deleteCommunityPost);

  const [draft, setDraft] = useState("");
  const [kind, setKind] = useState<PostKind>("update");

  /**
   * One clock for the whole list, ticking once a minute.
   *
   * Pinned in state rather than read per row, so every "3 minutes ago" on the page agrees with
   * every other and the list does not re-read the clock on unrelated re-renders.
   *
   * Seeded in the lazy initialiser, not in an effect. Setting it from an effect body causes a
   * second render on every mount for no benefit, and there is no hydration risk to avoid: the
   * store rehydrates from localStorage after mount, so `posts` is empty on the server render and
   * on the first client render, and no timestamp derived from this clock is emitted by either.
   */
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  // These were `businessCategory || "Dairy"` and `district || "Bundelkhand"`. For anyone who has
  // not finished onboarding — which includes every first-time visitor — the page told them they
  // were in the Dairy community in Bundelkhand, a region that is not even one of the districts
  // onboarding offers. The heading now names the user's own answers or says nothing.
  const currentCategory = onboardingInput.businessCategory;
  const location = onboardingInput.location?.district;
  const knowsUser = Boolean(currentCategory && location);

  const remaining = MAX_POST_LENGTH - draft.length;

  function submit() {
    const body = draft.trim();
    if (!body) return;
    addCommunityPost(
      newPost(body, kind, { district: location ?? null, category: currentCategory || null }),
    );
    setDraft("");
    setKind("update");
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      {/* Header Area */}
      <div className="bg-gradient-to-r from-primary/10 to-accent/10 p-6 md:p-8 rounded-3xl border shadow-sm mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <Badge variant="outline" className="mb-2 bg-background">
            Community Hub
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold font-heading">
            {knowsUser ? (
              <>
                <span className="capitalize">{currentCategory}</span> Entrepreneurs —{" "}
                <span className="capitalize text-primary">{location}</span>
              </>
            ) : (
              "Community Hub"
            )}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-xl">
            {knowsUser
              ? "Write down what you are working on. Notes are kept on this device."
              : "Finish onboarding and this becomes your own block’s hub."}
          </p>
        </div>
        {/* A member count was shown here. It was invented, and an invented traction number on a
            government submission is not worth the pixel it sits on. It returns when there is a
            real one to show. */}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar */}
        <div className="lg:col-span-3 space-y-6 hidden lg:block">
          <Card>
            <CardHeader className="pb-3">
              {/* Was "Your Groups", with "Local Dairy Farmers" styled as the joined row and a
                  "Join More Groups" button that had no onClick. There is no membership state in
                  this app, so telling a first-time visitor which groups they belong to is an
                  invention about them, not about the data. */}
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Example groups
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center gap-3 p-2 rounded-md text-muted-foreground">
                <div className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center">
                  🐮
                </div>
                Local Dairy Farmers
              </div>
              <div className="flex items-center gap-3 p-2 rounded-md text-muted-foreground">
                <div className="w-8 h-8 rounded bg-accent/20 text-accent flex items-center justify-center">
                  💰
                </div>
                Mudra Loan Seekers
              </div>
              <Button variant="ghost" className="w-full text-xs mt-2 justify-start" disabled>
                <PlusCircle className="w-4 h-4 mr-2" aria-hidden="true" /> Joining is not built yet
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                Who actually helps
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Real institutions in your district — RSETIs, KVKs, District Industries Centres and
                NABARD offices — with their public listings.
              </p>
              <Link href="/mentors">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Open the directory
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Main Feed */}
        <div className="lg:col-span-6 space-y-6">
          {/* Composer */}
          <Card className="shadow-sm border-primary/20">
            <CardContent className="p-4 flex gap-4">
              <Avatar>
                <AvatarFallback className="bg-primary text-primary-foreground">ME</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-3">
                <Textarea
                  placeholder="Share an update, ask a question, or note a requirement…"
                  className="bg-muted/50 border-none focus-visible:ring-1 focus-visible:ring-primary"
                  value={draft}
                  maxLength={MAX_POST_LENGTH}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter alone inserts a newline — this is a paragraph field, not a chat box.
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
                  }}
                  aria-label="Write a post"
                />
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div
                    className="flex gap-2"
                    role="group"
                    aria-label="What kind of post is this?"
                  >
                    {POST_KINDS.map((k) => (
                      <button
                        key={k.id}
                        type="button"
                        onClick={() => setKind(k.id)}
                        aria-pressed={kind === k.id}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          kind === k.id
                            ? "border-primary bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        {k.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    {/* Only shown near the limit — a permanent counter on an empty box is noise. */}
                    {remaining < 100 && (
                      <span
                        className={`text-xs tabular-nums ${remaining < 0 ? "text-destructive" : "text-muted-foreground"}`}
                      >
                        {remaining}
                      </span>
                    )}
                    <Button
                      size="sm"
                      className="rounded-full px-6"
                      disabled={!draft.trim()}
                      onClick={submit}
                    >
                      Post <Send className="w-3 h-3 ml-2" aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* The user's own posts */}
          {posts.map((post) => (
            <Card key={post.id} className="shadow-sm border-primary/30">
              <CardHeader className="pb-3 flex flex-row items-start gap-4 space-y-0">
                <Avatar>
                  <AvatarFallback className="bg-primary text-primary-foreground">ME</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm">You</h3>
                    <Badge
                      variant="outline"
                      className="text-[10px] border-primary/40 bg-primary/10 text-primary"
                    >
                      Saved on this device
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    <span className="capitalize">{post.kind}</span>
                    {` • ${relativeTime(post.createdAt, now)}`}
                    {post.district ? ` • ${post.district}` : ""}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive shrink-0"
                  onClick={() => deleteCommunityPost(post.id)}
                  aria-label="Delete this post"
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </Button>
              </CardHeader>
              <CardContent className="pb-4 text-sm leading-relaxed whitespace-pre-wrap break-words">
                {post.body}
              </CardContent>
            </Card>
          ))}

          {/* Examples */}
          {EXAMPLE_POSTS.map((post) => (
            <Card key={post.id} className="shadow-sm bg-muted/20">
              <CardHeader className="pb-3 flex flex-row items-start gap-4 space-y-0">
                <Avatar>
                  <AvatarFallback
                    className={
                      post.author.role === "ngo" || post.author.role === "financial-institution"
                        ? "bg-accent text-white"
                        : "bg-muted"
                    }
                  >
                    {post.author.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-sm">{post.author.name}</h3>
                    {post.author.verified && (
                      <BadgeCheck className="w-4 h-4 text-primary" aria-hidden="true" />
                    )}
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Example
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-2">
                    <span className="capitalize">{post.author.role.replace("-", " ")}</span> •{" "}
                    {post.time}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[10px] shrink-0">
                  {post.category}
                </Badge>
              </CardHeader>
              <CardContent className="pb-3 text-sm leading-relaxed">{post.content}</CardContent>
              <CardFooter className="border-t p-2 flex">
                {/* Disabled, not merely unwired. These counts belong to the example, and a button
                    that appears to accept a tap but changes nothing is worse than an honest one. */}
                <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground" disabled>
                  <ThumbsUp className="w-4 h-4 mr-2" aria-hidden="true" /> {post.likes}
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground" disabled>
                  <MessageSquare className="w-4 h-4 mr-2" aria-hidden="true" /> {post.comments}
                </Button>
                <Button variant="ghost" size="sm" className="flex-1 text-muted-foreground" disabled>
                  <Share2 className="w-4 h-4 mr-2" aria-hidden="true" /> Share
                </Button>
              </CardFooter>
            </Card>
          ))}

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Posts you write are kept in this browser only. There is no account and no server behind
            this screen yet, so nobody else can see them — the three examples above show what a
            deployed feed would carry.
          </p>
        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-3 space-y-6">
          <Card className="border-accent/20 bg-accent/5">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-accent">
                Marketplace
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Compose a buying or selling requirement precisely enough that a trader can act on
                it, then send it on WhatsApp or export it.
              </p>
              <Link href="/marketplace">
                <Button variant="outline" size="sm" className="w-full text-xs">
                  Write a requirement
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
