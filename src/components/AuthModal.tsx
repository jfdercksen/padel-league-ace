
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Shield, Loader2 } from 'lucide-react';

interface AuthModalProps {
  type: 'signin' | 'signup';
  onClose: () => void;
  onSwitchType: (type: 'signin' | 'signup') => void;
}

const AuthModal = ({ type, onClose, onSwitchType }: AuthModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    role: 'player',
    phone: '',
    country: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Simulate API call
    setTimeout(() => {
      setLoading(false);
      console.log('Auth attempt:', { type, formData });
      // For demo purposes, we'll just close the modal
      onClose();
    }, 2000);
  };

  const roleOptions = [
    {
      value: 'player',
      label: 'Player',
      description: 'Join leagues and compete',
      icon: Users,
      color: 'bg-blue-500'
    },
    {
      value: 'league_admin',
      label: 'League Admin',
      description: 'Create and manage leagues',
      icon: Trophy,
      color: 'bg-green-600'
    },
    {
      value: 'super_admin',
      label: 'Super Admin',
      description: 'Full system access',
      icon: Shield,
      color: 'bg-purple-600'
    }
  ];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl text-center">
            {type === 'signin' ? 'Welcome Back' : 'Join Padel League Ace'}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={type} onValueChange={(value) => onSwitchType(value as 'signin' | 'signup')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="signin" className="space-y-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full gradient-padel text-white" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Sign In
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="signup" className="space-y-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone (Optional)</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 234 567 8900"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="United States"
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Account Type</Label>
                <div className="grid gap-3">
                  {roleOptions.map((role) => (
                    <div
                      key={role.value}
                      className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.role === role.value
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                      onClick={() => setFormData({ ...formData, role: role.value })}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 ${role.color} rounded-full flex items-center justify-center`}>
                          <role.icon className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold">{role.label}</h4>
                            {role.value === 'league_admin' && (
                              <Badge variant="secondary" className="text-xs">Approval Required</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{role.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <Button type="submit" className="w-full gradient-padel text-white" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Account
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};

export default AuthModal;
