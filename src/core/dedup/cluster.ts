import { ImageHashes } from "../hash/multiHash";
import { compareImages } from "../hash/comparison";

export type Asset = {
  assetId: string
  hashes: ImageHashes
  image: any // Placeholder for image object
  metadata: {
    faces: { clarityScore: number }[]
  }
}

export type Cluster = {
  seed: Asset
  members: Asset[]
}

function sortAssets(assets: Asset[]): Asset[] {
  return [...assets].sort((a, b) => a.assetId.localeCompare(b.assetId))
}

function createCluster(
  seed: Asset,
  assets: Asset[],
  visited: Set<string>
): Cluster {
  const members: Asset[] = [seed]

  visited.add(seed.assetId)

  for (const candidate of assets) {
    if (visited.has(candidate.assetId)) continue

    const result = compareImages(seed, candidate)

    // Ticket 9: Confidence Filter
    if (result.isDuplicate) {
      members.push(candidate)
      visited.add(candidate.assetId)
    }
  }

  return {
    seed,
    members
  }
}

function validateCluster(cluster: Cluster): Cluster {
  const validMembers = cluster.members.filter(member => {
    // Seed is always valid
    if (member.assetId === cluster.seed.assetId) return true
    const result = compareImages(cluster.seed, member)
    return result.isDuplicate
  })

  return {
    seed: cluster.seed,
    members: validMembers
  }
}

export function buildClusters(assets: Asset[]): Cluster[] {
  const sorted = sortAssets(assets)
  const visited = new Set<string>()
  const clusters: Cluster[] = []

  for (const asset of sorted) {
    if (visited.has(asset.assetId)) continue

    let cluster = createCluster(asset, sorted, visited)
    cluster = validateCluster(cluster)

    // Ticket 10: Debug Logging
    console.log({
      seed: cluster.seed.assetId,
      members: cluster.members.map(m => m.assetId)
    })

    // Ticket 8: Remove Singleton Clusters
    if (cluster.members.length > 1) {
      clusters.push(cluster)
    }
  }

  return clusters
}
