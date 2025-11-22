#pragma once

#include <string>

namespace d_hexagon {
namespace domain {
namespace model {

    class User {
    private:
        int id;
        std::string username;
        std::string email;
        bool active;

    public:
        // Constructors
        User(int id, const std::string& username, const std::string& email);
        User();

        // Destructor
        virtual ~User();

        // Getters
        int getId() const;
        std::string getUsername() const;
        std::string getEmail() const;
        bool isActive() const;

        // Setters
        void setUsername(const std::string& newUsername);
        void setEmail(const std::string& newEmail);
        
        // Domain Logic
        void activate();
        void deactivate();

        // Utilities
        std::string toString() const;
    };

} // namespace model
} // namespace domain
} // namespace d_hexagon
