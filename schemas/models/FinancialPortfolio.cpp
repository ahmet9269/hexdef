#include "FinancialPortfolio.hpp"

namespace c_hex {
namespace domain {
namespace model {

    FinancialPortfolio::FinancialPortfolio(const std::string& id, const std::string& owner, double value)
        : portfolioId(id), ownerName(owner), totalValue(value), isManaged(true), currency("USD") {}

    FinancialPortfolio::FinancialPortfolio() : totalValue(0.0), isManaged(false) {}

    FinancialPortfolio::~FinancialPortfolio() = default;

    std::string FinancialPortfolio::getPortfolioId() const { return portfolioId; }
    std::string FinancialPortfolio::getOwnerName() const { return ownerName; }
    std::vector<std::vector<double>> FinancialPortfolio::getHistoricalReturns() const { return historicalReturns; }
    std::vector<std::vector<float>> FinancialPortfolio::getRiskMatrix() const { return riskMatrix; }
    double FinancialPortfolio::getTotalValue() const { return totalValue; }
    std::string FinancialPortfolio::getCurrency() const { return currency; }

    void FinancialPortfolio::setHistoricalReturns(const std::vector<std::vector<double>>& returns) { historicalReturns = returns; }
    void FinancialPortfolio::setRiskMatrix(const std::vector<std::vector<float>>& risk) { riskMatrix = risk; }
    void FinancialPortfolio::setTotalValue(double value) { totalValue = value; }

}
}
}
