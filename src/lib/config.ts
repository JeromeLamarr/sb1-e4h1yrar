/**
 * Environment configuration and validation
 * All environment variables are centralized and validated here
 */

interface Config {
  supabase: {
    url: string;
    anonKey: string;
  };
}

const getEnvVariable = (key: string): string => {
  const value = import.meta.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
};

export const config: Config = {
  supabase: {
    url: getEnvVariable('VITE_SUPABASE_URL'),
    anonKey: getEnvVariable('VITE_SUPABASE_ANON_KEY'),
  },
};

/**
 * Helper function to build Supabase API URLs
 */
export const buildSupabaseUrl = (path: string): string => {
  return `${config.supabase.url}${path}`;
};

/**
 * Helper function to build Supabase storage URLs
 */
export const buildStorageUrl = (bucket: string, filePath: string): string => {
  return buildSupabaseUrl(`/storage/v1/object/public/${bucket}/${filePath}`);
};

/**
 * Helper function to build Supabase function URLs
 */
export const buildFunctionUrl = (functionName: string): string => {
  return buildSupabaseUrl(`/functions/v1/${functionName}`);
};
