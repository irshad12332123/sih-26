import "dotenv/config";

export const env = {
  port: Number(process.env.PORT || 4000),
  host: process.env.HOST || "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN || process.env.CLIENT_URL || "http://localhost:5173",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  storageDriver: process.env.STORAGE_DRIVER || "local",
  authMode: process.env.AUTH_MODE || "demo",
  dataDriver: process.env.DATA_DRIVER || "local-json",
  dataFile: process.env.NLAMS_DATA_FILE || ".data/nlams.json",
  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES || 10485760),
};
