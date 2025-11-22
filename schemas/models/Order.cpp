#include "Order.hpp"

namespace c_hex {
namespace domain {
namespace model {

    Order::Order(const std::string& orderId, double totalAmount, int itemCount)
        : orderId(orderId), totalAmount(totalAmount), itemCount(itemCount) {}

    Order::Order() : totalAmount(0.0), itemCount(0) {}

    Order::~Order() = default;

    std::string Order::getOrderId() const { return orderId; }
    double Order::getTotalAmount() const { return totalAmount; }
    int Order::getItemCount() const { return itemCount; }

    void Order::setTotalAmount(double amount) { totalAmount = amount; }
    void Order::setItemCount(int count) { itemCount = count; }

}
}
}
