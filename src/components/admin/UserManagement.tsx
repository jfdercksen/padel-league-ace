import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Shield, User, Trophy, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type UserRole = Database["public"]["Enums"]["user_role"];

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
  created_at: string | null;
  is_approved: boolean | null;
  captainOfTeams: { id: string; name: string }[];
}

const roleConfig = {
  super_admin: { label: "Super Admin", icon: Shield, color: "bg-red-500" },
  league_admin: { label: "League Admin", icon: Trophy, color: "bg-blue-500" },
  player: { label: "Player", icon: User, color: "bg-green-500" },
};

export function UserManagement() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Fetch all users with captain teams
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // Fetch all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, full_name, role, created_at, is_approved")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch all teams to find captains
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("id, name, created_by");

      if (teamsError) throw teamsError;

      // Map teams to their captains
      const teamsByCaptain =
        teams?.reduce((acc, team) => {
          if (!acc[team.created_by]) {
            acc[team.created_by] = [];
          }
          acc[team.created_by].push({ id: team.id, name: team.name });
          return acc;
        }, {} as Record<string, { id: string; name: string }[]>) || {};

      // Combine profiles with their captain teams
      return (
        profiles?.map((profile) => ({
          ...profile,
          captainOfTeams: teamsByCaptain[profile.id] || [],
        })) || []
      ) as Profile[];
    },
  });

  // Fetch current user's role
  const { data: currentUserProfile } = useQuery({
    queryKey: ["current-user-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: UserRole }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", userId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("User role updated successfully");
      setUpdatingUserId(null);
    },
    onError: (error) => {
      toast.error("Failed to update role: " + error.message);
      setUpdatingUserId(null);
    },
  });

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    // Prevent changing own role
    if (userId === user?.id) {
      toast.error("You cannot change your own role");
      return;
    }
    setUpdatingUserId(userId);
    updateRoleMutation.mutate({ userId, newRole });
  };

  // Check if current user is super_admin
  if (currentUserProfile?.role !== "super_admin") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-red-500">Access Denied</CardTitle>
          <CardDescription>
            Only Super Admins can access user management.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          User Management
        </CardTitle>
        <CardDescription>
          Manage user roles and permissions. Total users: {users?.length || 0}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Current Role</TableHead>
              <TableHead>Teams (Captain)</TableHead>
              <TableHead>Change Role</TableHead>
              <TableHead>Joined</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((profile) => {
              const config = roleConfig[profile.role];
              const RoleIcon = config.icon;
              const isCurrentUser = profile.id === user?.id;

              return (
                <TableRow key={profile.id} className={isCurrentUser ? "bg-muted/50" : ""}>
                  <TableCell className="font-medium">
                    {profile.full_name || "No name"}
                    {isCurrentUser && (
                      <Badge variant="outline" className="ml-2">You</Badge>
                    )}
                  </TableCell>
                  <TableCell>{profile.email}</TableCell>
                  <TableCell>
                    <Badge className={`${config.color} text-white`}>
                      <RoleIcon className="h-3 w-3 mr-1" />
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {profile.captainOfTeams.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {profile.captainOfTeams.map((team) => (
                          <Badge key={team.id} variant="outline" className="text-xs">
                            <Users className="h-3 w-3 mr-1" />
                            {team.name}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isCurrentUser ? (
                      <span className="text-muted-foreground text-sm">Cannot change</span>
                    ) : (
                      <Select
                        value={profile.role}
                        onValueChange={(value: UserRole) => handleRoleChange(profile.id, value)}
                        disabled={updatingUserId === profile.id}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="player">Player</SelectItem>
                          <SelectItem value="league_admin">League Admin</SelectItem>
                          <SelectItem value="super_admin">Super Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {profile.created_at
                      ? new Date(profile.created_at).toLocaleDateString()
                      : "Unknown"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

