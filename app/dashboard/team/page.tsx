import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { getOrgFeatures } from "@/lib/subscriptions"
import { redirect } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/Button"
import { Lock, Users, UserPlus, Shield, ArrowUpRight } from "lucide-react"
import Link from "next/link"

export default async function TeamPage() {
  const session = await auth()

  if (!session?.user?.email) {
    redirect("/signin")
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      organization: {
        include: {
          subscription: true,
          users: true
        }
      }
    }
  })

  if (!user?.organization) {
    redirect("/onboarding")
  }

  const org = user.organization
  const subscription = org.subscription

  const features = getOrgFeatures(
    subscription?.tier || "STARTER",
    subscription?.maxPropertiesOverride ?? undefined
  )

  if (!features.hasTeamRoles) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team & Roles</h1>
          <p className="text-muted-foreground mt-1">Manage team members and permissions</p>
        </div>

        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-blue-500/10" />
          <div className="relative p-12 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-purple-500/20">
              <Lock className="h-10 w-10 text-purple-400" />
            </div>
            <h3 className="mb-2 text-2xl font-semibold">Team Management Locked</h3>
            <p className="mb-8 text-muted-foreground max-w-2xl mx-auto">
              Invite team members, assign roles (Owner, Manager, Maintenance), and manage permissions with the Pro plan.
            </p>
            <Button size="lg" asChild>
              <Link href="/dashboard/billing">
                <ArrowUpRight className="mr-2 h-4 w-4" />
                Upgrade to Pro
              </Link>
            </Button>
          </div>
        </Card>

        <div className="grid gap-4 md:grid-cols-3">
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
              <CardDescription>Invite and manage team members</CardDescription>
            </CardHeader>
          </Card>
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Role Management
              </CardTitle>
              <CardDescription>Assign Owner, Manager, Maintenance roles</CardDescription>
            </CardHeader>
          </Card>
          <Card className="opacity-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invitations
              </CardTitle>
              <CardDescription>Send and track team invitations</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team & Roles</h1>
          <p className="text-muted-foreground mt-1">Manage team members and permissions</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/team/invite">
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>{org.users.length} member(s) in your organization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {org.users.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-teal to-brand-purple flex items-center justify-center text-white font-medium">
                    {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium">{member.name || "Unnamed"}</p>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-500/20 text-blue-400">
                    {member.role}
                  </span>
                  <Button variant="ghost" size="icon">Edit</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}