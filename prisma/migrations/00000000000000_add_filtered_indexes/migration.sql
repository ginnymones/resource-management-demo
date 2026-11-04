-- Filtered/partial index for bandwidth lookup (not supported natively by Prisma)
-- This index speeds up queries for associates with available bandwidth
CREATE INDEX IF NOT EXISTS idx_associates_bandwidth ON associates(bandwidth_cache) WHERE bandwidth_cache > 0;
