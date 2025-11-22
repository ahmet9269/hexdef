#pragma once

#include <string>

namespace c_hex {
namespace domain {
namespace model {

    class Product {
    private:
        int id;
        std::string name;
        double price;
        bool inStock;

    public:
        Product(int id, const std::string& name, double price, bool inStock);
        Product();
        virtual ~Product();

        int getId() const;
        std::string getName() const;
        double getPrice() const;
        bool isInStock() const;

        void setName(const std::string& name);
        void setPrice(double price);
        void setInStock(bool inStock);
    };

}
}
}
