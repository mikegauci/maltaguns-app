'use client'

import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { MyBlogPosts } from '@/components/profile/MyBlogPosts'
import { ProfilePageLayout } from '@/components/profile/ProfilePageLayout'
import { useProfileContext } from '@/components/profile/ProfileDataProvider'

export function ProfileBlogPageClient() {
  const { blogPosts, handleDeletePost } = useProfileContext()

  return (
    <ProfilePageLayout
      title="Blog"
      description="Manage your blog posts and share with the community"
    >
      {blogPosts.length > 0 ? (
        <MyBlogPosts
          blogPosts={blogPosts}
          handleDeletePost={handleDeletePost}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 text-lg font-semibold">No blog posts yet</h3>
            <p className="mb-4 text-center text-muted-foreground">
              Start sharing your knowledge and experiences with the community
            </p>
            <Link href="/blog/create">
              <Button>
                <BookOpen className="mr-2 h-4 w-4" />
                Write Your First Post
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}
    </ProfilePageLayout>
  )
}
