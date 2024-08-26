const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const { SPORTS } = require("./constant");

const SOFASCORE = "https://matchstat.com/sofaapi";


function getPredPerc(votes) {
   if (votes.vote1 !== undefined) {
      votes.vote1 = votes.vote1 + Math.floor(Math.random() * (votes.vote1 * 0.05 - votes.vote1 * 0.01 + 1)) + votes.vote1 * 0.01;
   }
   if (votes.voteX !== undefined) {
      votes.voteX = votes.voteX + Math.floor(Math.random() * (votes.voteX * 0.02 - votes.voteX * 0.01 + 1)) + votes.voteX * 0.01;
   }
   if (votes.vote2 !== undefined) {
      votes.vote2 = votes.vote2 - Math.floor(Math.random() * (votes.vote2 * 0.04 - votes.vote2 * 0.01 + 1)) + votes.vote2 * 0.01;
   }

   const voteA = votes.vote1 || 0;
   const voteX = votes.voteX || 0;
   const voteB = votes.vote2 || 0;
   const total = voteA + voteX + voteB;

   if (total === 0) {
      return null;
   }

   let percA = parseFloat(((voteA / total) * 100).toFixed(2));
   let percX = parseFloat(((voteX / total) * 100).toFixed(2));
   let percB = parseFloat(((voteB / total) * 100).toFixed(2));
   const randPerc = parseFloat((Math.random() * (400.00 - 150.00) + 150.00) / (Math.random() * (130 - 70) + 70)).toFixed(2);

   if (percA > 95.00 || percA === 50 || percA === percB) {
      percA -= randPerc;
      percB += randPerc;
   } else if (percB > 95.00) {
      percB -= randPerc;
      percA += randPerc;
   }

   return [percA, percX, percB];
}
// Function to format the date as YYYY-MM-DD
function formatDate(date) {
   const year = date.getFullYear();
   const month = String(date.getMonth() + 1).padStart(2, '0');
   const day = String(date.getDate()).padStart(2, '0');
   return `${year}-${month}-${day}`;
}

async function fetchSportsDataBySportId(sportId, date) {
   const MAX_RETRIES = 10;
   let retry = 0;
   while (retry < MAX_RETRIES) {
      try {
         const url = `${SOFASCORE}/events/schedule/date?sport_id=${sportId}&date=${date}&${Math.floor(Math.random() * 9e10) + 1e10}`;
         const response = await fetch(url, {
            method: "GET",
            headers: {
               'x-api-key': 'weLoveYouJames@1234'
            }
         });

         if (response.status === 429) {
            throw new Error("rate limit")
         }

         return await response.json();
      } catch (error) {

         if (error.message.includes("429") || error.message == "rate limit") {
            await new Promise(resolve => setTimeout(resolve, 2000));
            retry++;
         } else {
            console.error(`Fetch failed: ${error.message}`);
            break;
         }
      }
   }

   throw new Error("Something went wrong after multiple retries.");
}

async function fetchPredictionVotes(eventId) {
   try {
      const url = `${SOFASCORE}/events/predict?event_id=${eventId}&${Math.floor(Math.random() * 9e10) + 1e10}`;
      const response = await fetch(url, {
         method: "GET",
         headers: {
            'x-api-key': 'weLoveYouJames@1234'
         }
      });
      const result = await response.json();

      const data = result.data;

      return data ? getPredPerc(data) : [0, 0, 0];
   } catch (error) {
      throw error;
   }
}


//  Insert data to database
async function saveH2hData(event = {}, siteUrl = "https://tennispredictionstoday.org/") {
   try {
      const wpPostUri = `${siteUrl}/wp-json/wp-h2h-info/v1/add-data`;
      const response = await fetch(`${wpPostUri}?${Math.floor(Math.random() * 9e10) + 1e10}`, {
         method: "POST",
         headers: {
            "Content-Type": "application/json"
         },
         body: JSON.stringify(event)
      });

      return response.json();
   } catch (error) {
      throw error;
   }
}




async function mainExe() {
   try {
      const HOUR_IN_SECONDS = 3600;
      const currentUnixTime = Math.floor(Date.now() / 1000);

      // const today = new Date();
      // today.setHours(0, 0, 0, 0);
      // const todayTimestamp = today.getTime() / 1000;  // Convert to Unix timestamp (seconds since epoch)
      const finalMatches = [];

      for (const sport of SPORTS.filter(e => e.siteUrl)) {
         const sportId = sport.id;
         const sportName = sport.name;
         const favLeagues = sport.favLeagues;
         const formattedDate = formatDate(new Date());

         console.log(`Fetching data for ${sportName} on ${formattedDate}`);

         const response = await fetchSportsDataBySportId(sportId, formattedDate);

         const data = response.data ?? [];

         console.log(`Found total ${data.length || 0} from ${sportName} on ${formattedDate}`);

         for (const item of data) {
            const isUniqueTournament = item?.tournament?.hasOwnProperty("uniqueTournament");

            if (isUniqueTournament && favLeagues.includes(item?.tournament?.uniqueTournament?.id)) {


               if (item.startTimestamp >= currentUnixTime) {
                  finalMatches.push({ item, siteUrl: sport?.siteUrl });
               }

               // const end = item?.endTimestamp ? item?.endTimestamp : 0;
               // if (item.startTimestamp < currentUnixTime && end < currentUnixTime && end > (currentUnixTime - HOUR_IN_SECONDS)) {
               //    finalMatches.push({ item, siteUrl: sport?.siteUrl });
               // }
            }
         }
         console.log(`Site is : ${sport?.siteUrl}`);
      }

      console.log(`Got total ${finalMatches.length} final matches.`);

      let chunk = 10;
      for (let i = 0; i < finalMatches.length; i += chunk) {
         let chunks = finalMatches.slice(i, i + chunk);


         const InsertToDB = chunks && chunks.map(async (match) => {
            const result = await saveH2hData(match.item, match?.siteUrl);
            console.log(result);
         });

         await Promise.all(InsertToDB);
         await new Promise(resolve => setTimeout(resolve, 2000));
      }

      process.exit(0);
   } catch (error) {
      console.log(`Error: ${error?.message}`);
      process.exit(1);
   }
}

mainExe();
