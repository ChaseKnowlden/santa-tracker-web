import { HexCoord } from '../../engine/utils/hex-coord.js';

const {
  BufferAttribute,
  InstancedBufferAttribute
} = self.THREE;

export class Map {
  constructor(grid) {
    const tileCount = grid.width * grid.height;

    const tileStates = new InstancedBufferAttribute(
        new Float32Array(tileCount * 2), 2, 1);

    const tileOffsets = new InstancedBufferAttribute(
        new Float32Array(tileCount * 3), 3, 1);

    const tileObstacles = new InstancedBufferAttribute(
        new Float32Array(tileCount), 1, 1);

    const oddq = new HexCoord();
    const halfSize = new HexCoord(grid.width / 2.0, grid.height / 2.0, 0);
    const intermediateHexCoord = new HexCoord();

    oddq.set(grid.width, grid.height, 0.0);

    const maxMag = oddq.length() / 2.0;
    const erosionMag = maxMag * 0.65;

    const tileRings = [];

    for (let q = 0; q < grid.width; ++q) {
      for (let r = 0; r < grid.height; ++r) {
        oddq.set(q, r, 0);

        const mag = intermediateHexCoord.subVectors(oddq, halfSize).length();
        const magDelta = Math.abs(erosionMag - mag);

        const index = grid.oddqToIndex(oddq);
        const offset = grid.indexToOffset(index, oddq);

        // Decide the initial state of the tile (either hidden or shown):
        const erosionChance = 0.5 + magDelta / erosionMag;
        const state = mag > erosionMag
            ? Math.random() < erosionChance
                ? 0.0
                : 1.0
            : 1.0;

        // 15% chance to be a random tree for now:
        const obstacle = Math.random() > 0.85
            ? Math.floor(Math.random() * 4)
            : -1.0;

        if (state > 0.0) {
          // Build up an array of map "rings" for eroding tiles later:
          const ringIndex = Math.floor(mag);

          tileRings[ringIndex] = tileRings[ringIndex] || [];
          tileRings[ringIndex].push(index);
        }

        // Stash tile details into geometry attributes
        tileStates.setXY(index, state, 0.0);
        tileOffsets.setXYZ(index, offset.x, -offset.y, 0.0);
        tileObstacles.setX(index, obstacle);
      }
    }

    console.log(tileOffsets.array);
    this.tileCount = tileCount;
    this.tileRings = tileRings;

    this.tileStates = tileStates;
    this.tileOffsets = tileOffsets;
    this.tileObstacles = tileObstacles;
  }

  erode(numberOfTiles) {
    for (let i = 0; i < numberOfTiles; ++i) {
      const ring = this.tileRings[this.tileRings.length - 1];

      if (ring == null) {
        this.tileRings.pop();
        return;
      }

      const tileIndex = Math.floor(Math.random() * ring.length)
      const index = ring[tileIndex];

      if (index != null) {
        const state = this.getTileState(index);

        if (state === 1.0) {
          this.setTileState(index, 3.0);
        } else if (state === 3.0) {
          ring.splice(tileIndex, 1);
          this.setTileState(index, 4.0);
        }
      }

      if (ring.length === 0) {
        this.tileRings.pop();
      }
    }
  }

  setTileObstacle(index, sprite) {
    const tileObstacles = this.tileObstacles;

    tileObstacles.setX(index, sprite);
    tileObstacles.needsUpdate = true;
  }

  getTileObstacle(index) {
    return this.tileObstacles.getX(index);
  }

  setTileState(index, state) {
    const tileStates = this.tileStates;

    tileStates.setXY(index, state, performance.now());
    tileStates.needsUpdate = true;
  }

  getTileState(index) {
    return this.tileStates.getX(index);
  }
};
