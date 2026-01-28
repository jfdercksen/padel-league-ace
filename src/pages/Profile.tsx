import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Shield, 
  LogOut, 
  Edit3, 
  Save, 
  X,
  Trophy,
  Users,
  Calendar
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Profile = () => {
  const { profile, signOut, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    phone: profile?.phone || '',
    country: profile?.country || ''
  });

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    
    try {
      const { error } = await updateProfile({
        full_name: formData.full_name,
        phone: formData.phone,
        country: formData.country
      });
      
      if (error) throw error;
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      setEditing(false);
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      full_name: profile?.full_name || '',
      phone: profile?.phone || '',
      country: profile?.country || ''
    });
    setEditing(false);
  };

  const getRoleBadge = () => {
    switch (profile?.role) {
      case 'super_admin':
        return <Badge className="bg-purple-100 text-purple-800"><Shield className="w-3 h-3 mr-1" />Super Admin</Badge>;
      case 'league_admin':
        return <Badge className="bg-blue-100 text-blue-800"><Trophy className="w-3 h-3 mr-1" />League Admin</Badge>;
      default:
        return <Badge className="bg-green-100 text-green-800"><User className="w-3 h-3 mr-1" />Player</Badge>;
    }
  };

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background flex items-center justify-center px-4">
        <p className="text-muted-foreground">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="mb-2">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-muted-foreground">Manage your account settings</p>
      </div>

      {/* Messages */}
      {message && (
        <Alert className={`mb-4 ${message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Profile Card */}
      <Card className="mb-2">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              Account Information
            </CardTitle>
            {!editing ? (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit3 className="w-4 h-4 mr-1" />
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  <X className="w-4 h-4" />
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Role Badge */}
          <div className="flex items-center justify-between pb-4 border-b">
            <span className="text-sm text-muted-foreground">Account Type</span>
            {getRoleBadge()}
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <User className="w-4 h-4" />
              Full Name
            </Label>
            {editing ? (
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Your full name"
              />
            ) : (
              <p className="font-medium">{profile.full_name || 'Not set'}</p>
            )}
          </div>

          {/* Email (read-only) */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-4 h-4" />
              Email
            </Label>
            <p className="font-medium">{profile.email}</p>
            <p className="text-xs text-muted-foreground">Email cannot be changed</p>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-4 h-4" />
              Phone
            </Label>
            {editing ? (
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Your phone number"
              />
            ) : (
              <p className="font-medium">{profile.phone || 'Not set'}</p>
            )}
          </div>

          {/* Country */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="w-4 h-4" />
              Country
            </Label>
            {editing ? (
              <Input
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="Your country"
              />
            ) : (
              <p className="font-medium">{profile.country || 'Not set'}</p>
            )}
          </div>

          {/* Member Since */}
          <div className="space-y-2 pt-4 border-t">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="w-4 h-4" />
              Member Since
            </Label>
            <p className="font-medium">
              {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : 'Unknown'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card className="mb-2">
        <CardHeader className="pb-4">
          <CardTitle className="text-base">Quick Links</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => navigate('/teams')}>
            <Users className="w-5 h-5" />
            <span className="text-xs">My Teams</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => navigate('/matches')}>
            <Calendar className="w-5 h-5" />
            <span className="text-xs">My Matches</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => navigate('/leagues')}>
            <Trophy className="w-5 h-5" />
            <span className="text-xs">Leagues</span>
          </Button>
          <Button variant="outline" className="h-auto py-3 flex flex-col items-center gap-1" onClick={() => navigate('/standings')}>
            <Trophy className="w-5 h-5" />
            <span className="text-xs">Standings</span>
          </Button>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card className="border-red-100">
        <CardContent className="pt-6">
          <Button 
            variant="outline" 
            className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;

