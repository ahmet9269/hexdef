#pragma once

#include <string>
#include <vector>

namespace c_hex {
namespace domain {
namespace model {

    class GameMap {
    private:
        long mapId;
        std::string name;
        std::vector<std::vector<int>> terrain;
        std::vector<std::vector<std::string>> objectPlacement;
        int difficulty;
        int maxPlayers;
        bool isRanked;
        std::vector<std::string> tags;

    public:
        GameMap(long id, const std::string& name, 
               const std::vector<std::vector<int>>& terrain,
               int diff, int maxP, bool ranked);
        GameMap();
        virtual ~GameMap();

        long getMapId() const;
        std::string getName() const;
        std::vector<std::vector<int>> getTerrain() const;
        std::vector<std::vector<std::string>> getObjectPlacement() const;
        int getDifficulty() const;
        bool getIsRanked() const;

        void setTerrain(const std::vector<std::vector<int>>& t);
        void setTags(const std::vector<std::string>& t);
    };

}
}
}
