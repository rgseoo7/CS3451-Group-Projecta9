#include "Common.h"
#include "OpenGLCommon.h"
#include "OpenGLMarkerObjects.h"
#include "OpenGLBgEffect.h"
#include "OpenGLMesh.h"
#include "OpenGLViewer.h"
#include "OpenGLWindow.h"
#include "TinyObjLoader.h"
#include "OpenGLSkybox.h"
#include <algorithm>
#include <iostream>
#include <random>
#include <unordered_set>
#include <vector>
#include <string>

#ifndef __Main_cpp__
#define __Main_cpp__

#ifdef __APPLE__
#define CLOCKS_PER_SEC 100000
#endif

class MyDriver : public OpenGLViewer
{
    std::vector<OpenGLTriangleMesh*> mesh_object_array;
    OpenGLBgEffect* bgEffect = nullptr;
    OpenGLSkybox* skybox = nullptr;
    clock_t startTime;

public:
    virtual void Initialize()
    {
        draw_axes = false;
        startTime = clock();
        OpenGLViewer::Initialize();
    }

    virtual void Initialize_Data()
    {
        //// ---------- Shaders ----------
        OpenGLShaderLibrary::Instance()->Add_Shader_From_File("shaders/basic.vert", "shaders/basic.frag", "basic");
        OpenGLShaderLibrary::Instance()->Add_Shader_From_File("shaders/basic.vert", "shaders/environment.frag", "environment");
        OpenGLShaderLibrary::Instance()->Add_Shader_From_File("shaders/stars.vert", "shaders/stars.frag", "stars");
        OpenGLShaderLibrary::Instance()->Add_Shader_From_File("shaders/basic.vert", "shaders/alphablend.frag", "blend");
        OpenGLShaderLibrary::Instance()->Add_Shader_From_File("shaders/billboard.vert", "shaders/alphablend.frag", "billboard");
        OpenGLShaderLibrary::Instance()->Add_Shader_From_File("shaders/terrain.vert", "shaders/terrain.frag", "terrain");
        OpenGLShaderLibrary::Instance()->Add_Shader_From_File("shaders/skybox.vert", "shaders/skybox.frag", "skybox");

        //// ---------- Textures (some of these are unused now, but harmless) ----------
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/earth_color.png", "sphere_color");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/earth_normal.png", "sphere_normal");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/bunny_color.jpg", "bunny_color");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/bunny_normal.png", "bunny_normal");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/window.png", "window_color");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/buzz_color.png", "buzz_color");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/star.png", "star_color");

        // tree textures
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/Bark__0.jpg", "bark0");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/Bark__1.jpg", "bark1");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/Bark__S.jpg", "barkS");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/Bottom_T.jpg", "barkBottom");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/Mossy_Tr.jpg", "mossyTree");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/Oak_Leav.jpg", "oakLeaves");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/Sonnerat.jpg", "sonnerat");
        OpenGLTextureLibrary::Instance()->Add_Texture_From_File("tex/Walnut_L.jpg", "walnutLeaves");



        //// ---------- Lights ----------
        opengl_window->Add_Light(Vector3f(3, 1, 3), Vector3f(0.1, 0.1, 0.1), Vector3f(1, 1, 1), Vector3f(0.5, 0.5, 0.5));
        opengl_window->Add_Light(Vector3f(0, 0, -5), Vector3f(0.1, 0.1, 0.1), Vector3f(0.9, 0.9, 0.9), Vector3f(0.5, 0.5, 0.5));
        opengl_window->Add_Light(Vector3f(-5, 1, 3), Vector3f(0.1, 0.1, 0.1), Vector3f(0.9, 0.9, 0.9), Vector3f(0.5, 0.5, 0.5));


        //// Terrain
        OpenGLTriangleMesh* terrain = nullptr;
        {
            terrain = Add_Obj_Mesh_Object("obj/plane.obj");

            Matrix4f S, T, R;
            S.setIdentity();
            T.setIdentity();

            // Rotate the plane
            R <<
                1, 0, 0, 0,
                0, 0, 1, 0,
                0, -1, 0, 0,
                0, 0, 0, 1;

            // Ground size
            S(0, 0) = 3.0f;   // wider left-right
            S(1, 1) = 1.0f;   // vertical scale of heights
            S(2, 2) = 4.0f;   // depth

            // Nudge left & down
            T(0, 3) = -7.5f;  // a bit farther left
            T(1, 3) = -3.2f;  // a bit farther down
            T(2, 3) = -3.0f;  // same depth

            terrain->Set_Model_Matrix(T * R * S);

            // terrain material
            terrain->Set_Ka(Vector3f(0.3f, 0.3f, 0.3f));   // more ambient
            terrain->Set_Kd(Vector3f(1.0f, 1.0f, 1.0f));   // fully lit by diffuse
            terrain->Set_Ks(Vector3f(0.2f, 0.2f, 0.2f));   // not super shiny
            terrain->Set_Shininess(32.f);

            terrain->Add_Shader_Program(OpenGLShaderLibrary::Get_Shader("terrain"));
        }

        //// trees alng path
        {
            const float xLeft = -6.0f;  // farther left
            const float xRight = 1.2f;  // farther right
            const float zPos = -2.0f;  // a bit "into" the scene

            // --- Left tree ---
            {
                auto tree = Add_Obj_Mesh_Object("obj/trees9.obj");

                Matrix4f S, T;
                S.setIdentity();
                T.setIdentity();

                S(0, 0) = S(1, 1) = S(2, 2) = 0.15f;

                T(0, 3) = xLeft;
                T(1, 3) = -2.0f;
                T(2, 3) = zPos;

                tree->Set_Model_Matrix(T * S);

                tree->Set_Ka(Vector3f(0.05f, 0.1f, 0.05f));
                tree->Set_Kd(Vector3f(0.2f, 0.5f, 0.2f));
                tree->Set_Ks(Vector3f(0.05f, 0.05f, 0.05f));
                tree->Set_Shininess(16.0f);

                tree->Add_Texture("tex_color", OpenGLTextureLibrary::Get_Texture("mossyTree"));

                tree->Add_Shader_Program(OpenGLShaderLibrary::Get_Shader("basic"));
            }

            // --- Right tree ---
            {
                auto tree = Add_Obj_Mesh_Object("obj/trees9.obj");

                Matrix4f S, T;
                S.setIdentity();
                T.setIdentity();

                S(0, 0) = S(1, 1) = S(2, 2) = 0.15f;

                T(0, 3) = xRight;
                T(1, 3) = -2.0f;
                T(2, 3) = zPos;

                tree->Set_Model_Matrix(T * S);

                tree->Set_Ka(Vector3f(0.05f, 0.1f, 0.05f));
                tree->Set_Kd(Vector3f(0.2f, 0.5f, 0.2f));
                tree->Set_Ks(Vector3f(0.05f, 0.05f, 0.05f));
                tree->Set_Shininess(16.0f);

                tree->Add_Texture("tex_color", OpenGLTextureLibrary::Get_Texture("mossyTree"));

                tree->Add_Shader_Program(OpenGLShaderLibrary::Get_Shader("basic"));
            }


        }

        //// ---------- Finalize all mesh objects ----------
        for (auto& mesh_obj : mesh_object_array) {
            Set_Polygon_Mode(mesh_obj, PolygonMode::Fill);
            Set_Shading_Mode(mesh_obj, ShadingMode::TexAlpha);
            mesh_obj->Set_Data_Refreshed();
            mesh_obj->Initialize();
        }

        Toggle_Play();
    }


    //// add mesh object by reading an .obj file
    OpenGLTriangleMesh* Add_Obj_Mesh_Object(std::string obj_file_name)
    {
        auto mesh_obj = Add_Interactive_Object<OpenGLTriangleMesh>();
        Array<std::shared_ptr<TriangleMesh<3>>> meshes;
        // Obj::Read_From_Obj_File(obj_file_name, meshes);
        Obj::Read_From_Obj_File_Discrete_Triangles(obj_file_name, meshes);

        mesh_obj->mesh = *meshes[0];
        std::cout << "load tri_mesh from obj file, #vtx: " << mesh_obj->mesh.Vertices().size() << ", #ele: " << mesh_obj->mesh.Elements().size() << std::endl;

        mesh_object_array.push_back(mesh_obj);
        return mesh_obj;
    }

    //// add mesh object by reading an array of vertices and an array of elements
    OpenGLTriangleMesh* Add_Tri_Mesh_Object(const std::vector<Vector3>& vertices, const std::vector<Vector3i>& elements)
    {
        auto obj = Add_Interactive_Object<OpenGLTriangleMesh>();
        mesh_object_array.push_back(obj);
        // set up vertices and elements
        obj->mesh.Vertices() = vertices;
        obj->mesh.Elements() = elements;

        return obj;
    }

    //// Go to next frame
    virtual void Toggle_Next_Frame()
    {
        for (auto& mesh_obj : mesh_object_array)
            mesh_obj->setTime(GLfloat(clock() - startTime) / CLOCKS_PER_SEC);

        if (bgEffect) {
            bgEffect->setResolution((float)Win_Width(), (float)Win_Height());
            bgEffect->setTime(GLfloat(clock() - startTime) / CLOCKS_PER_SEC);
            bgEffect->setFrame(frame++);
        }

        if (skybox) {
            skybox->setTime(GLfloat(clock() - startTime) / CLOCKS_PER_SEC);
        }

        OpenGLViewer::Toggle_Next_Frame();
    }

    virtual void Run()
    {
        OpenGLViewer::Run();
    }
};

int main(int argc, char* argv[])
{
    MyDriver driver;
    driver.Initialize();
    driver.Run();
}

#endif