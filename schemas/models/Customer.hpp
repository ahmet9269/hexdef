#pragma once

#include <string>

namespace c_hex {
namespace domain {
namespace model {

    class Customer {
    private:
        long customerId;
        std::string firstName;
        std::string lastName;
        std::string email;
        int age;

    public:
        Customer(long id, const std::string& first, const std::string& last, const std::string& email, int age);
        Customer();
        virtual ~Customer();

        long getCustomerId() const;
        std::string getFirstName() const;
        std::string getLastName() const;
        std::string getEmail() const;
        int getAge() const;

        void setEmail(const std::string& email);
        void setAge(int age);
    };

}
}
}
