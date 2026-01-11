import mongoose from "mongoose";
import dotenv from "dotenv";
import ForexServer from "./src/models/ForexServer.js";

// Load environment variables
dotenv.config();

// Forex servers data from Servers.ts
const forexServersData = [
  "PUPrime-Live",
  "PUPrime-Demo",
  "PUPrime-Real",
  "FTMO-Demo",
  "FTMO-Live",
  "Axi-Real",
  "Axi-Demo",
  "FP-Markets-Live",
  "FP-Markets-Demo",
  "Global-Prime-Live",
  "Global-Prime-Demo",
  "Goat-Funded-Trader-Live",
  "Goat-Funded-Trader-Demo",
  "E8-Funding-Demo",
  "E8-Funding-Live",
  "E8-Markets-Demo",
  "E8-Markets-Live",
  "Funding-Pips-Demo",
  "Funding-Pips-Live",
  "FundedNext-Demo",
  "FundedNext-Live",
  "FundedNext-Stellar",
  "ICMarkets-Live01",
  "ICMarkets-Live02",
  "ICMarkets-Live03",
  "ICMarkets-Demo",
  "Pepperstone-Live",
  "Pepperstone-Demo",
  "Pepperstone-Live01",
  "Pepperstone-Edge-01",
  "OANDA-v20 Live",
  "OANDA-v20 Practice",
  "OANDA-Live",
  "OANDA-Demo",
  "FXCM-Live",
  "FXCM-Demo",
  "FXCM-USDDemo01",
  "FXCM-GBPDemo01",
  "Exness-Real1",
  "Exness-Real2",
  "Exness-Demo",
  "XMGlobal-Real",
  "XMGlobal-Demo",
  "XMGlobal-Real1",
  "XMGlobal-Real2",
  "Tickmill-Live",
  "Tickmill-Demo",
  "Tickmill-Pro-Live",
  "Tickmill-Pro-Demo",
  "Eightcap-Live",
  "Eightcap-Demo",
  "Eightcap-Real",
  "AvaTrade-Real",
  "AvaTrade-Demo",
  "HFM-Live",
  "HFM-Demo",
  "HFMarketsGlobal-Live1",
  "HFMarketsGlobal-Demo",
  "HotForex-Live",
  "Alpari-Live",
  "Alpari-Demo",
  "Alpari-Pro-Live",
  "FBS-Live",
  "FBS-Demo",
  "HYCM-Live",
  "HYCM-Demo",
  "AdmiralMarkets-Live",
  "AdmiralMarkets-Demo",
  "Admirals-Live",
  "Admirals-Demo",
  "FXPro-Live",
  "FXPro-Demo",
  "RoboForex-Live",
  "RoboForex-Demo",
  "RoboForex-ECN-Live",
  "OctaFX-Live",
  "OctaFX-Demo",
  "Swissquote-Live",
  "Swissquote-Demo",
  "Darwinex-Live",
  "Darwinex-Demo",
  "BlackBullMarkets-Live",
  "BlackBullMarkets-Demo",
  "Fusion-Markets-Live",
  "Fusion-Markets-Demo",
  "The5ers-Live",
  "The5ers-Demo",
  "The5ers-Real",
  "The5ers-Bootcamp",
  "Topstep-FX-Demo",
  "Topstep-FX-Live",
  "Topstep-Futures",
  "MyForexFunds-Demo",
  "MyForexFunds-Live",
  "Funded-Trading-Plus-Live",
  "Funded-Trading-Plus-Demo",
  "Lux-Trading-Firm-Live",
  "Lux-Trading-Firm-Demo",
  "FXIFY-Instant",
  "FXIFY-Eval",
  "Blue-Guardian-Demo",
  "Blue-Guardian-Live",
  "Other",
];


// Connect to MongoDB and seed data
const seedForexServers = async () => {
  try {
    // Connect to MongoDB
    const mongoURI =
      process.env.NODE_ENV === "production"
        ? process.env.MONGO_PRODUCTION_URL
        : process.env.MONGO_DEVELOPMENT_URL;

    if (!mongoURI) {
      console.error("❌ MongoDB connection string is not defined in environment variables");
      process.exit(1);
    }

    await mongoose.connect(mongoURI);
    console.log("✅ MongoDB Connected successfully");

    // Clear existing data (optional - comment out if you want to keep existing data)
    // await ForexServer.deleteMany({});
    // console.log("🗑️  Cleared existing forex servers");

    // Insert or update servers
    let inserted = 0;
    let updated = 0;

    for (const serverName of forexServersData) {
      const existingServer = await ForexServer.findOne({ serverName: serverName });
      
      if (!existingServer) {
        // Insert new server
        await ForexServer.create({
          serverName: serverName,
          isActive: true,
        });
        inserted++;
      } else {
        // Update existing server
        await ForexServer.findOneAndUpdate(
          { serverName: serverName },
          {
            isActive: true,
          }
        );
        updated++;
      }
    }

    console.log("\n📊 Seeding Summary:");
    console.log(`✅ Inserted: ${inserted} servers`);
    console.log(`🔄 Updated: ${updated} servers`);
    console.log(`📝 Total processed: ${forexServersData.length} servers`);

    // Display all servers
    const allServers = await ForexServer.find({}).sort({ serverName: 1 });
    console.log("\n📋 All Forex Servers in Database:");
    console.log("─".repeat(50));
    allServers.forEach((server, index) => {
      console.log(
        `${(index + 1).toString().padStart(3)}. ${server.serverName.padEnd(45)} [Active: ${server.isActive}]`
      );
    });
    console.log("─".repeat(50));

    console.log("\n✅ Seeding completed successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding forex servers:", error);
    process.exit(1);
  }
};

// Run the seed function
seedForexServers();

