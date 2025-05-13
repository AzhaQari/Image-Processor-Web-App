interface User {
  id: string; // This will be the Google ID
  email: string;
  name?: string;
  // Potentially other fields like accessToken, refreshToken (handle securely!)
}

// In-memory store for users
const users: Map<string, User> = new Map();

export const userService = {
  findOrCreateUser: (profile: { id: string; email: string; name?: string }): User => {
    let user = users.get(profile.id);
    if (!user) {
      user = {
        id: profile.id,
        email: profile.email,
        name: profile.name,
      };
      users.set(profile.id, user);
      console.log('New user created:', user.email);
    } else {
      // Optionally update user details if they changed
      user.email = profile.email;
      user.name = profile.name;
      users.set(profile.id, user);
      console.log('User found:', user.email);
    }
    return user;
  },

  findById: (id: string): User | undefined => {
    return users.get(id);
  },
  
  // For debugging or admin purposes, not for general use
  _getAllUsers: (): User[] => {
    return Array.from(users.values());
  }
}; 