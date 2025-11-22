#include "GameMap.hpp"

namespace c_hex {
namespace domain {
namespace model {

    GameMap::GameMap(long id, const std::string& name, 
                   const std::vector<std::vector<int>>& terrain,
                   int diff, int maxP, bool ranked)
        : mapId(id), name(name), terrain(terrain), 
          difficulty(diff), maxPlayers(maxP), isRanked(ranked) {}

    GameMap::GameMap() : mapId(0), difficulty(0), maxPlayers(0), isRanked(false) {}

    GameMap::~GameMap() = default;

    long GameMap::getMapId() const { return mapId; }
    std::string GameMap::getName() const { return name; }
    std::vector<std::vector<int>> GameMap::getTerrain() const { return terrain; }
    std::vector<std::vector<std::string>> GameMap::getObjectPlacement() const { return objectPlacement; }
    int GameMap::getDifficulty() const { return difficulty; }
    bool GameMap::getIsRanked() const { return isRanked; }

    void GameMap::setTerrain(const std::vector<std::vector<int>>& t) { terrain = t; }
    void GameMap::setTags(const std::vector<std::string>& t) { tags = t; }

}
}
}
