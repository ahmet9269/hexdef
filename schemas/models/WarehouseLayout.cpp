#include "WarehouseLayout.hpp"

namespace c_hex {
namespace domain {
namespace model {

    WarehouseLayout::WarehouseLayout(int id, const std::string& zoneName, 
                                   const std::vector<std::vector<std::vector<int>>>& grid,
                                   const std::vector<std::vector<double>>& temperatureMap,
                                   bool isActive, const std::string& managerName, long capacity)
        : id(id), zoneName(zoneName), grid(grid), temperatureMap(temperatureMap),
          isActive(isActive), managerName(managerName), capacity(capacity) {}

    WarehouseLayout::WarehouseLayout() : id(0), isActive(false), capacity(0) {}

    WarehouseLayout::~WarehouseLayout() = default;

    int WarehouseLayout::getId() const { return id; }
    std::string WarehouseLayout::getZoneName() const { return zoneName; }
    std::vector<std::vector<std::vector<int>>> WarehouseLayout::getGrid() const { return grid; }
    std::vector<std::vector<double>> WarehouseLayout::getTemperatureMap() const { return temperatureMap; }
    bool WarehouseLayout::getIsActive() const { return isActive; }
    std::string WarehouseLayout::getManagerName() const { return managerName; }
    long WarehouseLayout::getCapacity() const { return capacity; }

    void WarehouseLayout::setZoneName(const std::string& name) { zoneName = name; }
    void WarehouseLayout::setGrid(const std::vector<std::vector<std::vector<int>>>& newGrid) { grid = newGrid; }
    void WarehouseLayout::setTemperatureMap(const std::vector<std::vector<double>>& map) { temperatureMap = map; }

}
}
}
