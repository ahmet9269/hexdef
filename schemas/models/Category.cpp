#include "Category.hpp"

namespace c_hex {
namespace domain {
namespace model {

    Category::Category(int id, const std::string& title)
        : id(id), title(title) {}

    Category::Category() : id(0) {}

    Category::~Category() = default;

    int Category::getId() const { return id; }
    std::string Category::getTitle() const { return title; }

    void Category::setTitle(const std::string& newTitle) { title = newTitle; }

}
}
}
