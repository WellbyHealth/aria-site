/** @type {import('next').NextConfig} */
export default {
  serverExternalPackages: ['@electric-sql/pglite', 'pg'],
  outputFileTracingIncludes: { '/**': ['./db/schema.sql'] },
  poweredByHeader: false,
};
