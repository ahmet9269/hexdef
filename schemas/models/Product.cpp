#include "Product.hpp"

namespace c_hex {
namespace domain {
namespace model {

    Product::Product(int id, const std::string& name, double price, bool inStock)
        : id(id), name(name), price(price), inStock(inStock) {}

    Product::Product() : id(0), price(0.0), inStock(false) {}

    Product::~Product() = default;

    int Product::getId() const { return id; }
    std::string Product::getName() const { return name; }
    double Product::getPrice() const { return price; }
    bool Product::isInStock() const { return inStock; }

    void Product::setName(const std::string& newName) { name = newName; }
    void Product::setPrice(double newPrice) { price = newPrice; }
    void Product::setInStock(bool newInStock) { inStock = newInStock; }

}
}
}
