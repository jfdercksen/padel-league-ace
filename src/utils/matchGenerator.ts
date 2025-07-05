import { supabase } from '@/integrations/supabase/client';

interface TeamRegistration {
  id: string;
  team_id: string;
  division_id: string;
  league_id: string;
  status: string;
}

export const generateRoundRobinMatches = async (leagueId: string) => {
  try {
    // 1. Get all approved teams grouped by division
    const { data: teams, error: teamsError } = await supabase
      .from('league_registrations')
      .select('id, team_id, division_id, league_id, status')
      .eq('league_id', leagueId)
      .eq('status', 'approved');

    if (teamsError) throw teamsError;
    if (!teams || teams.length === 0) {
      throw new Error('No approved teams found for this league');
    }

    // 2. Group teams by division
    const teamsByDivision = teams.reduce((acc, team) => {
      if (!acc[team.division_id]) {
        acc[team.division_id] = [];
      }
      acc[team.division_id].push(team);
      return acc;
    }, {} as Record<string, TeamRegistration[]>);

    // 3. Generate matches for each division
    const allMatches = [];
    
    for (const [divisionId, divisionTeams] of Object.entries(teamsByDivision)) {
      console.log(`Generating matches for division ${divisionId} with ${divisionTeams.length} teams`);
      
      // Round-robin: each team plays every other team once
      for (let i = 0; i < divisionTeams.length; i++) {
        for (let j = i + 1; j < divisionTeams.length; j++) {
          const match = {
            league_id: leagueId,
            division_id: divisionId,
            team1_id: divisionTeams[i].team_id,
            team2_id: divisionTeams[j].team_id,
            status: 'scheduled' as const
          };
          allMatches.push(match);
        }
      }
    }

    // 4. Insert all matches into database
    if (allMatches.length > 0) {
      const { data: insertedMatches, error: insertError } = await supabase
        .from('matches')
        .insert(allMatches)
        .select();

      if (insertError) throw insertError;

      console.log(`Successfully generated ${insertedMatches.length} matches`);
      return {
        success: true,
        matchesGenerated: insertedMatches.length,
        divisions: Object.keys(teamsByDivision).length
      };
    } else {
      throw new Error('No matches to generate');
    }

  } catch (error) {
    console.error('Error generating matches:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const clearAllMatches = async (leagueId: string) => {
    try {
        const { error } = await supabase
        .from('matches')
        .delete()
        .eq('league_id', leagueId);

        if (error) throw error;

        console.log('Successfully cleared all matches for league');
        return {
        success: true,
        message: 'All matches cleared successfully'
        };
    } catch (error) {
        console.error('Error clearing matches:', error);
        return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};