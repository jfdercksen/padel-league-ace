import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, MapPin, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import Header from '@/components/Header';

const Matches = () => {
  const { profile } = useAuth();


  // Sample match data - replace with real data from your database
  const upcomingMatches = [
    {
      id: 1,
      date: '2025-07-02',
      time: '18:00',
      opponent: 'Team Lightning',
      venue: 'Court A',
      league: 'Summer League 2025',
      division: 'Division B',
      status: 'pending'
    }
  ];

  const pastMatches = [
    {
      id: 2,
      date: '2025-06-25',
      time: '19:00',
      opponent: 'Team Storm',
      venue: 'Court B',
      league: 'Summer League 2025',
      division: 'Division B',
      score: '6-4, 6-2',
      result: 'won'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-court-surface/20 to-background">
      {/* Header */}
      <Header />

      {/* Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Your Matches</h2>
          <p className="text-muted-foreground">
            Track your upcoming games and match history
          </p>
        </div>

        {/* Upcoming Matches */}
        <div className="mb-8">
          <h3 className="text-2xl font-bold mb-4">Upcoming Matches</h3>
          <div className="space-y-4">
            {upcomingMatches.length > 0 ? (
              upcomingMatches.map((match) => (
                <Card key={match.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <Badge className="bg-green-100 text-green-800">
                            Upcoming
                          </Badge>
                          <Badge variant="outline">{match.league}</Badge>
                          <Badge variant="secondary">{match.division}</Badge>
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-semibold">vs {match.opponent}</h4>
                        </div>
                        
                        <div className="flex items-center gap-6 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(match.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{match.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{match.venue}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Reschedule
                        </Button>
                        <Button size="sm">
                          Accept Time
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Calendar className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Upcoming Matches</h3>
                  <p className="text-sm text-muted-foreground">
                    Join a league and create a team to start playing
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Past Matches */}
        <div>
          <h3 className="text-2xl font-bold mb-4">Match History</h3>
          <div className="space-y-4">
            {pastMatches.length > 0 ? (
              pastMatches.map((match) => (
                <Card key={match.id} className="hover:shadow-lg transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-3">
                        <div className="flex items-center gap-4">
                          <Badge className={match.result === 'won' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {match.result === 'won' ? 'Won' : 'Lost'}
                          </Badge>
                          <Badge variant="outline">{match.league}</Badge>
                          <Badge variant="secondary">{match.division}</Badge>
                        </div>
                        
                        <div>
                          <h4 className="text-lg font-semibold">vs {match.opponent}</h4>
                          <p className="text-muted-foreground">Score: {match.score}</p>
                        </div>
                        
                        <div className="flex items-center gap-6 text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            <span>{new Date(match.date).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span>{match.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{match.venue}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          View Details
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="border-dashed border-2">
                <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                  <Trophy className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-2">No Match History</h3>
                  <p className="text-sm text-muted-foreground">
                    Your completed matches will appear here
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Matches;