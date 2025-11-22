#include "Customer.hpp"

namespace c_hex {
namespace domain {
namespace model {

    Customer::Customer(long id, const std::string& first, const std::string& last, const std::string& email, int age)
        : customerId(id), firstName(first), lastName(last), email(email), age(age) {}

    Customer::Customer() : customerId(0), age(0) {}

    Customer::~Customer() = default;

    long Customer::getCustomerId() const { return customerId; }
    std::string Customer::getFirstName() const { return firstName; }
    std::string Customer::getLastName() const { return lastName; }
    std::string Customer::getEmail() const { return email; }
    int Customer::getAge() const { return age; }

    void Customer::setEmail(const std::string& newEmail) { email = newEmail; }
    void Customer::setAge(int newAge) { age = newAge; }

}
}
}
