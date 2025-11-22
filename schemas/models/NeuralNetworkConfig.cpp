#include "NeuralNetworkConfig.hpp"

namespace c_hex {
namespace domain {
namespace model {

    NeuralNetworkConfig::NeuralNetworkConfig(int id, const std::vector<int>& layers, double lr, const std::string& opt)
        : configId(id), layerSizes(layers), learningRate(lr), optimizer(opt), epochs(100), isTraining(false) {}

    NeuralNetworkConfig::NeuralNetworkConfig() : configId(0), learningRate(0.01), epochs(0), isTraining(false) {}

    NeuralNetworkConfig::~NeuralNetworkConfig() = default;

    int NeuralNetworkConfig::getConfigId() const { return configId; }
    std::vector<std::vector<std::vector<double>>> NeuralNetworkConfig::getWeights() const { return weights; }
    std::vector<std::vector<double>> NeuralNetworkConfig::getBiases() const { return biases; }
    double NeuralNetworkConfig::getLearningRate() const { return learningRate; }
    std::string NeuralNetworkConfig::getOptimizer() const { return optimizer; }
    bool NeuralNetworkConfig::getIsTraining() const { return isTraining; }

    void NeuralNetworkConfig::setWeights(const std::vector<std::vector<std::vector<double>>>& w) { weights = w; }
    void NeuralNetworkConfig::setBiases(const std::vector<std::vector<double>>& b) { biases = b; }
    void NeuralNetworkConfig::setIsTraining(bool training) { isTraining = training; }

}
}
}
