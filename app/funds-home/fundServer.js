// Server-side data loading for the fund pages (used by server components only)
import { cookies } from "next/headers";
import authenticate from "../../util/authenticate";
import db from "../../util/db";

// Mongo documents can't cross into client components (ObjectId etc.), so pass plain JSON
export function plain(doc) {
  if (!doc) return doc;
  const { _id, ...rest } = doc;
  return JSON.parse(JSON.stringify(rest));
}

export async function currentUser() {
  const cookieStore = cookies();
  return authenticate.login(cookieStore.get("email")?.value, cookieStore.get("session")?.value);
}

// The fund the signed-in user manages, with its announcements (newest first)
export async function loadManagedFund(user) {
  if (!user?.fundsManaging?.length) return { fund: null, announcements: [] };
  let fund = null;
  let announcements = [];
  try {
    await db.connect(async (conn) => {
      fund = await conn.collection("FundPortfolios").findOne({ fundID: user.fundsManaging[0] });
      if (fund) {
        const doc = await conn.collection("FundAnnouncements").findOne({ fundID: fund.fundID });
        announcements = doc?.announcements || [];
      }
    });
  } catch (e) {}
  // The access code is only served by /api/fund/settings
  const { accessCode, ...rest } = plain(fund) || {};
  return { fund: fund ? rest : null, announcements: sortAnnouncements(announcements) };
}

export async function loadFundBySymbol(symbol) {
  let fund = null;
  let announcements = [];
  let managers = [];
  try {
    await db.connect(async (conn) => {
      fund = await conn.collection("FundPortfolios").findOne({ fundSymbol: String(symbol).toUpperCase() });
      if (fund) {
        const doc = await conn.collection("FundAnnouncements").findOne({ fundID: fund.fundID });
        announcements = doc?.announcements || [];
        managers = await conn.collection("Users")
          .find({ accountID: { $in: fund.portfolioManagers || [] } },
            { projection: { firstName: 1, lastName: 1, username: 1 } })
          .toArray();
      }
    });
  } catch (e) {}
  return {
    fund: plain(fund),
    announcements: sortAnnouncements(announcements),
    managers: managers.map((m) => ({ name: `${m.firstName} ${m.lastName}`, username: m.username || null })),
  };
}

function sortAnnouncements(list) {
  return JSON.parse(JSON.stringify(list || [])).sort((a, b) => (b.time || 0) - (a.time || 0));
}
