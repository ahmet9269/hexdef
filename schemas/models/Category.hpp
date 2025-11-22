#pragma once

#include <string>

namespace c_hex {
namespace domain {
namespace model {

    class Category {
    private:
        int id;
        std::string title;

    public:
        Category(int id, const std::string& title);
        Category();
        virtual ~Category();

        int getId() const;
        std::string getTitle() const;

        void setTitle(const std::string& title);
    };

}
}
}
