"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userService = void 0;
// In-memory store for users
const users = new Map();
exports.userService = {
    findOrCreateUser: (profile) => {
        let user = users.get(profile.id);
        if (!user) {
            user = {
                id: profile.id,
                email: profile.email,
                name: profile.name,
            };
            users.set(profile.id, user);
            console.log('New user created:', user.email);
        }
        else {
            // Optionally update user details if they changed
            user.email = profile.email;
            user.name = profile.name;
            users.set(profile.id, user);
            console.log('User found:', user.email);
        }
        return user;
    },
    findById: (id) => {
        return users.get(id);
    },
    // For debugging or admin purposes, not for general use
    _getAllUsers: () => {
        return Array.from(users.values());
    }
};
