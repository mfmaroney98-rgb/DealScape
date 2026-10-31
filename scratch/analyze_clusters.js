import fs from 'fs';

const highConfidence = JSON.parse(fs.readFileSync('scratch/high_confidence_duplicates.json', 'utf8'));

// Build adjacency graph to find connected components (clusters)
const adj = new Map();
const orgMap = new Map();

function addEdge(u, v, reason) {
  if (!adj.has(u.id)) adj.set(u.id, []);
  if (!adj.has(v.id)) adj.set(v.id, []);
  adj.get(u.id).push({ to: v.id, reason });
  adj.get(v.id).push({ to: u.id, reason });
  orgMap.set(u.id, u);
  orgMap.set(v.id, v);
}

for (const pair of highConfidence) {
  addEdge(pair.org1, pair.org2, pair.reasons);
}

const visited = new Set();
const clusters = [];

for (const id of adj.keys()) {
  if (!visited.has(id)) {
    const cluster = [];
    const queue = [id];
    visited.add(id);

    while (queue.length > 0) {
      const curr = queue.shift();
      cluster.push(orgMap.get(curr));

      for (const edge of adj.get(curr)) {
        if (!visited.has(edge.to)) {
          visited.add(edge.to);
          queue.push(edge.to);
        }
      }
    }

    clusters.push(cluster);
  }
}

// Sort clusters by size descending, then by name
clusters.sort((a, b) => b.length - a.length || a[0].organization_name.localeCompare(b[0].organization_name));

console.log(`Total High Confidence Duplicate Clusters: ${clusters.length}`);
console.log(`Total Organizations involved in High Confidence Duplicates: ${visited.size}`);

// Write summary of clusters
const clusterSummary = clusters.map((c, idx) => ({
  clusterId: idx + 1,
  count: c.length,
  orgs: c.map(o => ({
    id: o.id,
    name: o.organization_name,
    website: o.website_url,
    buyer_type: o.buyer_type,
    created_at: o.created_at,
    criteria_count: parseInt(o.criteria_count),
    profile_count: parseInt(o.profile_count),
    listing_count: parseInt(o.listing_count)
  }))
}));

fs.writeFileSync('scratch/high_confidence_clusters.json', JSON.stringify(clusterSummary, null, 2));

// Print top clusters and stats
console.log('\nTop 15 Clusters:');
clusterSummary.slice(0, 15).forEach(c => {
  console.log(`\nCluster #${c.clusterId} (${c.count} duplicates):`);
  c.orgs.forEach(o => {
    console.log(`  - [${o.id}] "${o.name}" | Web: ${o.website || 'N/A'} | Criteria: ${o.criteria_count} | Profiles: ${o.profile_count} | Created: ${o.created_at?.slice(0, 10)}`);
  });
});
