#pragma once

#include <string>
#include <vector>

namespace c_hex {
namespace domain {
namespace model {

    class NeuralNetworkConfig {
    private:
        int configId;
        std::vector<int> layerSizes;
        std::vector<std::vector<std::vector<double>>> weights; // 3D
        std::vector<std::vector<double>> biases; // 2D
        double learningRate;
        std::string optimizer;
        int epochs;
        bool isTraining;

    public:
        NeuralNetworkConfig(int id, const std::vector<int>& layers, double lr, const std::string& opt);
        NeuralNetworkConfig();
        virtual ~NeuralNetworkConfig();

        int getConfigId() const;
        std::vector<std::vector<std::vector<double>>> getWeights() const;
        std::vector<std::vector<double>> getBiases() const;
        double getLearningRate() const;
        std::string getOptimizer() const;
        bool getIsTraining() const;

        void setWeights(const std::vector<std::vector<std::vector<double>>>& w);
        void setBiases(const std::vector<std::vector<double>>& b);
        void setIsTraining(bool training);
    };

}
}
}
