// This script will update all date formatting in ManageLeague.tsx to use the formatDate helper function

// 1. Find all instances of new Date(match.scheduled_date).toLocaleDateString() and replace with formatDate(match.scheduled_date)
// 2. Find all instances of new Date(selectedMatch.scheduled_date).toLocaleDateString() and replace with formatDate(selectedMatch.scheduled_date)

// The formatDate helper function has already been added to the top of the file:
// const formatDate = (dateString: string) => {
//   return new Date(dateString).toLocaleDateString('en-GB'); // dd/mm/yyyy format
// };

// The following replacements need to be made:

// 1. In the All Matches tab:
// <div>{new Date(match.scheduled_date).toLocaleDateString()}</div>
// Replace with:
// <div>{formatDate(match.scheduled_date)}</div>

// 2. In the Pending Matches tab:
// <div>{new Date(match.scheduled_date).toLocaleDateString()}</div>
// Replace with:
// <div>{formatDate(match.scheduled_date)}</div>

// 3. In the Upcoming Matches tab:
// <div>{new Date(match.scheduled_date).toLocaleDateString()}</div>
// Replace with:
// <div>{formatDate(match.scheduled_date)}</div>

// 4. In the Completed Matches tab:
// <div>{new Date(match.scheduled_date).toLocaleDateString()}</div>
// Replace with:
// <div>{formatDate(match.scheduled_date)}</div>

// 5. In the Delete Match dialog:
// {new Date(selectedMatch.scheduled_date).toLocaleDateString()}
// Replace with:
// {formatDate(selectedMatch.scheduled_date)}

// The league start and end dates have already been updated to use formatDate:
// Season: {formatDate(league.start_date)} - {formatDate(league.end_date)}