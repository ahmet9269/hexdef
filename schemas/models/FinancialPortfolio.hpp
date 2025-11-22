#pragma once

#include <string>
#include <vector>

namespace c_hex {
namespace domain {
namespace model {

    class FinancialPortfolio {
    private:
        std::string portfolioId;
        std::string ownerName;
        std::vector<double> assetAllocation;
        std::vector<std::vector<double>> historicalReturns; // 2D
        std::vector<std::vector<float>> riskMatrix; // 2D
        double totalValue;
        std::string lastUpdated;
        bool isManaged;
        std::string currency;

    public:
        FinancialPortfolio(const std::string& id, const std::string& owner, double value);
        FinancialPortfolio();
        virtual ~FinancialPortfolio();

        std::string getPortfolioId() const;
        std::string getOwnerName() const;
        std::vector<std::vector<double>> getHistoricalReturns() const;
        std::vector<std::vector<float>> getRiskMatrix() const;
        double getTotalValue() const;
        std::string getCurrency() const;

        void setHistoricalReturns(const std::vector<std::vector<double>>& returns);
        void setRiskMatrix(const std::vector<std::vector<float>>& risk);
        void setTotalValue(double value);
    };

}
}
}
