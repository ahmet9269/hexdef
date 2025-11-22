#include "User.h"
#include <iostream>

namespace d_hexagon {
namespace domain {
namespace model {

    // Constructors
    User::User(int id, const std::string& username, const std::string& email)
        : id(id), username(username), email(email), active(true) {}

    User::User() : id(0), active(false) {}

    // Destructor
    User::~User() = default;

    // Getters
    int User::getId() const { return id; }
    std::string User::getUsername() const { return username; }
    std::string User::getEmail() const { return email; }
    bool User::isActive() const { return active; }

    // Setters
    void User::setUsername(const std::string& newUsername) { username = newUsername; }
    void User::setEmail(const std::string& newEmail) { email = newEmail; }
    
    // Domain Logic
    void User::activate() {
        active = true;
        std::cout << "User " << username << " activated." << std::endl;
    }

    void User::deactivate() {
        active = false;
        std::cout << "User " << username << " deactivated." << std::endl;
    }

    // Utilities
    std::string User::toString() const {
        return "User{id=" + std::to_string(id) + 
               ", username='" + username + "'" + 
               ", email='" + email + "'" + 
               ", active=" + (active ? "true" : "false") + "}";
    }

} // namespace model
} // namespace domain
} // namespace d_hexagon
