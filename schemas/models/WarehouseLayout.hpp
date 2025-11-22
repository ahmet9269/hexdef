#pragma once

#include <string>
#include <vector>

namespace c_hex {
namespace domain {
namespace model {

    class WarehouseLayout {
    private:
        int id;
        std::string zoneName;
        std::vector<std::vector<std::vector<int>>> grid; // 3D array for shelves/bins
        std::vector<std::vector<double>> temperatureMap; // 2D array
        bool isActive;
        std::string managerName;
        long capacity;

    public:
        WarehouseLayout(int id, const std::string& zoneName, 
                       const std::vector<std::vector<std::vector<int>>>& grid,
                       const std::vector<std::vector<double>>& temperatureMap,
                       bool isActive, const std::string& managerName, long capacity);
        WarehouseLayout();
        virtual ~WarehouseLayout();

        int getId() const;
        std::string getZoneName() const;
        std::vector<std::vector<std::vector<int>>> getGrid() const;
        std::vector<std::vector<double>> getTemperatureMap() const;
        bool getIsActive() const;
        std::string getManagerName() const;
        long getCapacity() const;

        void setZoneName(const std::string& name);
        void setGrid(const std::vector<std::vector<std::vector<int>>>& newGrid);
        void setTemperatureMap(const std::vector<std::vector<double>>& map);
    };

}
}
}
