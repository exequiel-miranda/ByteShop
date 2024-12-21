import clientsModel from "../models/Client.js";
import employeesModel from "../models/Employees.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config.js";

const loginController = {};

// CREATE: Login para clientes, empleados y administrador
loginController.login = async (req, res) => {
  const { email, password } = req.body;

  // Validación de campos requeridos
  if (!email || !password) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    let userFound;
    let userType; 
    
    if (email === config.admin.email && password === config.admin.password) {
      userType = "admin"; 
      userFound = { _id: "admin" }; 
    } else {
      // Buscar primero en la colección de empleados
      userFound = await employeesModel.findOne({ email });
        userType = "employee"; 
    
      // Si no es un empleado, buscar en la colección de clientes
      if (!userFound) {
        userFound = await clientsModel.findOne({ email });
        userType = "client"; 
      }
    }
  
    // Si no se encuentra en ninguna colección (ni cliente ni empleado), devolver error
    if (!userFound) {
      console.log("No se encuentra en ninguna colección");
      return res.status(404).json({ message: "User not found" });
    }

    // Si no es el administrador, validar la contraseña
    if (userType !== "admin") {
      const isMatch = bcrypt.compare(password, userFound.password);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid password" });
      }
    }

    // Generar el token JWT
    jwt.sign(
      {
        id: userFound._id,
        userType,
      },
      config.jwt.secret,
      {
        expiresIn: config.jwt.expiresIn,
      },
      (err, token) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ message: "Error generating token" });
        }

        // Guardar el token en una cookie
        res.cookie("authToken", token, { httpOnly: true });
        res.status(200).json({ message: `${userType} login successful`, token });
      }
    );
  } catch (error) {
    res.status(500).json({ message: "Error", error: error.message });
  }
};

export default loginController;
