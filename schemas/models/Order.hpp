#pragma once

#include <string>

namespace c_hex {
namespace domain {
namespace model {

    class Order {
    private:
        std::string orderId;
        double totalAmount;
        int itemCount;

    public:
        Order(const std::string& orderId, double totalAmount, int itemCount);
        Order();
        virtual ~Order();

        std::string getOrderId() const;
        double getTotalAmount() const;
        int getItemCount() const;

        void setTotalAmount(double amount);
        void setItemCount(int count);
    };

}
}
}
